"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Fish,
  Trophy,
  Menu,
  X,
  Home,
  LogOut,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher"
import { createClient } from "@/lib/supabase/client"

interface AdminLayoutProps {
  children: React.ReactNode
}

interface UserData {
  id: string
  email: string
  name?: string
  isHlavniAdmin: boolean
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Don't apply layout protection to login page
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    // Skip auth check for login page
    if (isLoginPage) {
      setIsLoading(false)
      return
    }

    const checkAccess = async () => {
      const supabase = createClient()

      // Hardcoded admin user ID as fallback (prorybolov@gmail.com)
      const ADMIN_USER_ID = 'adfa3aa5-9e63-4a0b-8dac-f1f5911bcf25'

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      console.log('[AdminLayout] Auth check:', { authUser: authUser?.id, authError: authError?.message })

      if (!authUser) {
        console.log('[AdminLayout] No auth user, redirecting to login')
        router.push('/admin/login')
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('jmeno')
        .eq('id', authUser.id)
        .single()

      let isHlavniAdmin = false

      // Hardcoded admin check first
      if (authUser.id === ADMIN_USER_ID) {
        console.log('[AdminLayout] User is hardcoded admin!')
        isHlavniAdmin = true
      } else {
        // First check system_admins table (global admin)
        const { data: systemAdmin, error: sysAdminError } = await supabase
          .from('system_admins')
          .select('id, role')
          .eq('user_id', authUser.id)
          .maybeSingle()

        console.log('[AdminLayout] system_admins check:', { systemAdmin, error: sysAdminError?.message })

        if (systemAdmin) {
          // User is a system admin - has full access
          console.log('[AdminLayout] User is system admin!')
          isHlavniAdmin = true
        } else {
          // Check zavod_role table
          const { data: rolesData, error: rolesError } = await supabase
            .from('zavod_role')
            .select('role')
            .eq('user_id', authUser.id)
            .in('role', ['hlavni_admin', 'poradatel'])

          console.log('[AdminLayout] zavod_role check:', { rolesData, error: rolesError?.message })

          const roles = rolesData as Array<{ role: string }> | null

          if (!roles || roles.length === 0) {
            console.log('[AdminLayout] No admin roles found, redirecting to /')
            router.push('/')
            return
          }

          isHlavniAdmin = roles.some(r => r.role === 'hlavni_admin')
        }
      }

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        name: (profile as { jmeno?: string } | null)?.jmeno,
        isHlavniAdmin,
      })
      setIsLoading(false)
    }

    checkAccess()
  }, [router, isLoginPage])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  // For login page, just render children without admin layout
  if (isLoginPage) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
    { href: '/admin/zavody', label: 'Závody', icon: <Trophy className="h-4 w-4" /> },
  ]

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2">
              <Fish className="h-6 w-6 text-primary" />
              <span className="font-bold">Admin</span>
            </Link>
            {user.isHlavniAdmin && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                Hlavní admin
              </span>
            )}
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-1 ml-4">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  {item.icon}
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            {/* User info */}
            <span className="hidden md:inline text-sm text-muted-foreground">
              {user.name || user.email}
            </span>

            <ThemeSwitcher />

            {/* Sign out button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="hidden md:flex gap-2"
            >
              <LogOut className="h-4 w-4" />
              Odhlásit
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed right-0 top-14 bottom-0 w-64 bg-background border-l shadow-lg p-4">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                </Link>
              ))}
              <hr className="my-2" />
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {user.name || user.email}
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Odhlásit
              </Button>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 container py-6">
        {children}
      </main>
    </>
  )
}
