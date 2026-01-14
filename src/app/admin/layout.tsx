"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Fish,
  Trophy,
  Users,
  Settings,
  Menu,
  X,
  Plus,
  Home,
  LogOut,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher"
import { cn } from "@/lib/utils"
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

  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient()

      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login?redirect=/admin')
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('jmeno')
        .eq('id', authUser.id)
        .single()

      // Check if user has admin access
      const { data: rolesData } = await supabase
        .from('zavod_role')
        .select('role')
        .eq('user_id', authUser.id)
        .in('role', ['hlavni_admin', 'poradatel'])

      const roles = rolesData as Array<{ role: string }> | null

      if (!roles || roles.length === 0) {
        router.push('/')
        return
      }

      const isHlavniAdmin = roles.some(r => r.role === 'hlavni_admin')

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        name: (profile as { jmeno?: string } | null)?.jmeno,
        isHlavniAdmin,
      })
      setIsLoading(false)
    }

    checkAccess()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
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
    <div className="min-h-screen bg-background">
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
      <main className="container py-6">
        {children}
      </main>
    </div>
  )
}
