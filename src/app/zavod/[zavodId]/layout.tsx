"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Fish,
  Trophy,
  Image as ImageIcon,
  FileText,
  Settings,
  Menu,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Eye,
  UserCircle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher"
import { BottomNavigationWrapper } from "@/components/layout/BottomNavigationWrapper"
import { MobileMenu } from "@/components/layout/MobileMenu"
import { SwipeableContainer } from "@/components/common/SwipeableContainer"
import { SwipeIndicator } from "@/components/common/SwipeIndicator"
import { AuthCallbackHandler } from "@/components/auth"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { usePendingConfirmations } from "@/hooks/usePendingConfirmations"
import { getAdjacentPages } from "@/lib/navigation-order"
import type { Zavod, UserRole } from "@/lib/types"

interface ZavodLayoutProps {
  children: React.ReactNode
  params: Promise<{ zavodId: string }>
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: UserRole[]
}

interface UserData {
  id: string
  email: string
  name?: string
}

interface TeamData {
  id: string
  nazev: string
  barva?: string | null
}

export default function ZavodLayout({ children, params }: ZavodLayoutProps) {
  const [zavodId, setZavodId] = useState<string | null>(null)
  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [user, setUser] = useState<UserData | null>(null)
  const [userTeam, setUserTeam] = useState<TeamData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Get adjacent pages for swipe navigation
  const adjacentPages = zavodId ? getAdjacentPages(pathname, zavodId) : { prev: null, next: null }

  // Swipe navigation handlers
  const handleSwipeLeft = () => {
    if (adjacentPages.next) {
      router.push(adjacentPages.next)
    }
  }

  const handleSwipeRight = () => {
    if (adjacentPages.prev) {
      router.push(adjacentPages.prev)
    }
  }

  // Get pending confirmations count
  const { count: pendingCount } = usePendingConfirmations({
    zavodId: zavodId || '',
    enabled: !!zavodId && !!user,
  })

  // Resolve params
  useEffect(() => {
    params.then(p => setZavodId(p.zavodId))
  }, [params])

  // Fetch zavod data and user role
  useEffect(() => {
    if (!zavodId) return

    const supabase = createClient()

    const fetchZavod = async () => {
      const { data: zavodData } = await supabase
        .from('zavody')
        .select('*')
        .eq('id', zavodId)
        .single()

      if (zavodData) {
        setZavod(zavodData as Zavod)
      }
    }

    const fetchUserAndRole = async () => {
      console.log('fetchUserAndRole: Starting...')
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      console.log('fetchUserAndRole: getUser result:', { email: authUser?.email, error: authError?.message })

      if (authUser) {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('jmeno')
          .eq('id', authUser.id)
          .single()

        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: (profile as { jmeno?: string } | null)?.jmeno,
        })

        const { data: roleData, error: roleError } = await supabase
          .from('zavod_role')
          .select('role')
          .eq('user_id', authUser.id)
          .eq('zavod_id', zavodId)
          .single()

        console.log('fetchUserAndRole: Role result:', { role: roleData, error: roleError?.message })

        if (roleData) {
          setUserRole((roleData as { role: UserRole }).role)
        } else {
          setUserRole(null)
        }

        // Načíst tým uživatele
        const { data: teamMembership } = await supabase
          .from('clenove_tymu')
          .select('tym_id, tymy(id, nazev, barva)')
          .eq('user_id', authUser.id)
          .single()

        if (teamMembership?.tymy) {
          const team = teamMembership.tymy as unknown as TeamData
          // Ověřit, že tým patří k tomuto závodu
          const { data: teamCheck } = await supabase
            .from('tymy')
            .select('id, nazev, barva')
            .eq('id', team.id)
            .eq('zavod_id', zavodId)
            .single()

          if (teamCheck) {
            setUserTeam(teamCheck as TeamData)
          } else {
            setUserTeam(null)
          }
        } else {
          setUserTeam(null)
        }
      } else {
        setUser(null)
        setUserRole(null)
        setUserTeam(null)
      }

      setIsLoading(false)
    }

    // Initial fetch
    fetchZavod()
    fetchUserAndRole()

    // Subscribe to auth state changes (for magic link login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Re-fetch user and role after sign in
          await fetchUserAndRole()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserRole(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [zavodId])

  // Handle sign out
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
    window.location.href = '/'
  }

  if (!zavodId) {
    return <div className="flex items-center justify-center min-h-screen">Načítání...</div>
  }

  const navItems: NavItem[] = [
    { href: `/zavod/${zavodId}`, label: "Přehled", icon: <Fish className="h-4 w-4" /> },
    // Přidat úlovek - vždy viditelné (stránka sama ověří přihlášení a roli)
    { href: `/zavod/${zavodId}/ulovky`, label: "Přidat úlovek", icon: <Fish className="h-4 w-4" /> },
    { href: `/zavod/${zavodId}/leaderboard`, label: "Pořadí", icon: <Trophy className="h-4 w-4" /> },
    // Potvrzení - vždy viditelné (stránka sama ověří přihlášení)
    { href: `/zavod/${zavodId}/admin`, label: "Potvrzení", icon: <CheckCircle className="h-4 w-4" /> },
    { href: `/zavod/${zavodId}/galerie`, label: "Galerie", icon: <ImageIcon className="h-4 w-4" /> },
    { href: `/zavod/${zavodId}/pravidla`, label: "Pravidla", icon: <FileText className="h-4 w-4" /> },
    { href: `/zavod/${zavodId}/admin`, label: "Rozhodčí panel", icon: <Users className="h-4 w-4" />, roles: ['rozhodci', 'poradatel'] },
    { href: `/zavod/${zavodId}/admin/nastaveni`, label: "Nastavení", icon: <Settings className="h-4 w-4" />, roles: ['poradatel'] },
  ]

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true
    if (!userRole) return false
    return item.roles.includes(userRole)
  })

  const getStavBadge = () => {
    if (!zavod) return null
    
    switch (zavod.stav) {
      case 'priprava':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600">
            <Clock className="h-3 w-3" />
            Příprava
          </span>
        )
      case 'probiha':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
            <CheckCircle className="h-3 w-3" />
            Probíhá
          </span>
        )
      case 'ukoncen':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-600">
            <AlertCircle className="h-3 w-3" />
            Ukončen
          </span>
        )
      default:
        return null
    }
  }

  const isEmbargoActive = () => {
    if (!zavod?.embargo_od) return false
    const now = new Date()
    const embargoStart = new Date(zavod.embargo_od)
    const zavodEnd = new Date(zavod.datum_end)
    return now >= embargoStart && now <= zavodEnd
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 app-ui">
      {/* Auth callback handler for magic link tokens */}
      <AuthCallbackHandler />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Fish className="h-6 w-6 text-primary" />
              <span className="font-bold hidden sm:inline-block">Carp Club ČR</span>
            </Link>
            {zavod && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="font-medium truncate max-w-[200px]">{zavod.nazev}</span>
                {getStavBadge()}
                {isEmbargoActive() && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">
                    Embargo
                  </span>
                )}
              </>
            )}
            {/* Badge s týmem a rolí pro závodníky */}
            {userTeam && userRole && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                style={userTeam.barva ? { backgroundColor: `${userTeam.barva}15`, borderColor: `${userTeam.barva}30`, color: userTeam.barva } : undefined}
              >
                <Users className="h-3 w-3" />
                {userTeam.nazev}
                <span className="text-[10px] opacity-70">
                  {userRole === 'kapitan' ? '(K)' : ''}
                </span>
              </span>
            )}
          </div>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-1 ml-auto">
            {filteredNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  {item.icon}
                  {item.label}
                  {item.label === "Potvrzení" && pendingCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-white rounded-full min-w-[1.25rem] text-center">
                      {pendingCount}
                    </span>
                  )}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Theme switcher and mobile menu button */}
          <div className="flex items-center gap-2 ml-auto md:ml-4">
            <ThemeSwitcher />
            
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
      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        onSignOut={handleSignOut}
        zavodId={zavodId}
        userRole={userRole}
        pendingCount={pendingCount}
      />

      {/* Swipe indicator - shows current page position (mobile only) */}
      <div className="md:hidden border-b bg-background/50">
        <SwipeIndicator
          currentPage={pathname.replace(`/zavod/${zavodId}`, '') || ''}
          basePath={`/zavod/${zavodId}`}
          isAuthenticated={!!user}
          teamName={userTeam?.nazev}
          userRole={userRole || undefined}
        />
      </div>

      {/* Main content with swipe navigation */}
      <SwipeableContainer
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        threshold={75}
        showIndicator
        className="flex-1"
      >
        <main className="container py-6">
          {children}
        </main>
      </SwipeableContainer>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigationWrapper zavodId={zavodId} userRole={userRole} />
    </div>
  )
}
