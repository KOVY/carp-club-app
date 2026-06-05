import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import type { ZavodRole, Tym, ClenTymu } from '@/lib/types'

/**
 * Middleware for authentication and role-based routing
 * Requirement 9.4: Role-based routing and access control
 */

// Routes that require authentication
// Note: /zavod/*/ulovky is NOT protected here - the page handles auth itself
// This allows magic link users to access it before session is fully established
const protectedRoutes = [
  '/zavod/*/admin/nastaveni', // Only settings require strict middleware auth
  '/zavod/*/potvrzeni',
  '/admin',
  '/admin/*',
]

// Routes that are always public
const publicRoutes = [
  '/login',
  '/admin/login', // Separate admin login page
  '/zavod/*/verejnost',
  '/zavod/*/leaderboard',
  '/zavod/*/galerie',
  '/zavod/*/pravidla',
  '/archiv',
  '/pozvanka/*', // Registrace přes pozvánku je veřejná
]

// Admin-only routes (poradatel)
const adminRoutes = [
  '/zavod/*/admin/nastaveni',
]

// Referee routes (rozhodci, poradatel)
const refereeRoutes = [
  '/zavod/*/admin',
]

// Hlavní admin routes (hlavni_admin, poradatel)
const hlavniAdminRoutes = [
  '/admin',
  '/admin/*',
]

function matchRoute(pathname: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '(/.*)?$')
    return regex.test(pathname)
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Create Supabase client for middleware
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: CookieOptions }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  // Allow public routes without authentication
  if (matchRoute(pathname, publicRoutes)) {
    return response
  }

  // Check if route requires authentication
  if (matchRoute(pathname, protectedRoutes)) {
    if (!user) {
      // For admin routes, redirect to admin login
      if (matchRoute(pathname, hlavniAdminRoutes)) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }
      // For other protected routes, redirect to regular login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('returnTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check hlavní admin routes (/admin/*)
    if (matchRoute(pathname, hlavniAdminRoutes)) {
      const hasAdminAccess = await checkHlavniAdminAccess(supabase, user.id)
      if (!hasAdminAccess) {
        // Redirect to home if not hlavni_admin or poradatel
        return NextResponse.redirect(new URL('/', request.url))
      }
      return response
    }

    // Extract zavodId from URL for role checking
    const zavodIdMatch = pathname.match(/\/zavod\/([^/]+)/)
    if (zavodIdMatch) {
      const zavodId = zavodIdMatch[1]

      // Check admin routes
      if (matchRoute(pathname, adminRoutes)) {
        const role = await getUserRoleFromDb(supabase, user.id, zavodId)
        if (role !== 'poradatel' && role !== 'hlavni_admin') {
          // Redirect to zavod main page if not admin
          return NextResponse.redirect(new URL(`/zavod/${zavodId}`, request.url))
        }
      }

      // Check referee routes
      if (matchRoute(pathname, refereeRoutes) && !matchRoute(pathname, adminRoutes)) {
        const role = await getUserRoleFromDb(supabase, user.id, zavodId)
        if (role !== 'rozhodci' && role !== 'poradatel' && role !== 'hlavni_admin') {
          // Redirect to zavod main page if not referee or admin
          return NextResponse.redirect(new URL(`/zavod/${zavodId}`, request.url))
        }
      }
    }
  }

  return response
}

/**
 * Get user role from database
 */
async function getUserRoleFromDb(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
  zavodId: string
): Promise<string> {
  // First check zavod_role table
  const { data: zavodRole } = await supabase
    .from('zavod_role')
    .select('role')
    .eq('user_id', userId)
    .eq('zavod_id', zavodId)
    .single()

  if (zavodRole) {
    return (zavodRole as Pick<ZavodRole, 'role'>).role
  }

  // Check team membership
  const { data: teams } = await supabase
    .from('tymy')
    .select('id')
    .eq('zavod_id', zavodId)

  if (teams && teams.length > 0) {
    const teamIds = (teams as Pick<Tym, 'id'>[]).map(t => t.id)
    
    const { data: clenTymu } = await supabase
      .from('clenove_tymu')
      .select('role')
      .eq('user_id', userId)
      .in('tym_id', teamIds)
      .single()

    if (clenTymu) {
      return (clenTymu as Pick<ClenTymu, 'role'>).role
    }
  }

  return 'divak'
}

/**
 * Check if user has access to hlavní admin section
 * User must be system_admin OR have hlavni_admin/poradatel role somewhere
 */
async function checkHlavniAdminAccess(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string
): Promise<boolean> {
  // Import centralized admin check
  const { isSystemAdmin } = await import('@/lib/constants')

  if (isSystemAdmin(userId)) {
    console.log('[Middleware] User is system admin, granting access')
    return true
  }

  // First check system_admins via SECURITY DEFINER RPC (po migraci 016 už není přímý SELECT povolen)
  const { data: systemAdmin, error: sysAdminError } = await (supabase as any).rpc('is_system_admin', { p_user_id: userId })

  console.log('[Middleware] checkHlavniAdminAccess for userId:', userId)
  console.log('[Middleware] system_admins result:', { systemAdmin, error: sysAdminError?.message })

  if (systemAdmin === true) {
    console.log('[Middleware] User is system admin, granting access')
    return true
  }

  // Then check zavod_role table
  const { data: roles, error: rolesError } = await supabase
    .from('zavod_role')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['hlavni_admin', 'poradatel'])

  console.log('[Middleware] zavod_role result:', { roles, error: rolesError?.message })

  const hasAccess = roles !== null && roles.length > 0
  console.log('[Middleware] Final access decision:', hasAccess)

  return hasAccess
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
