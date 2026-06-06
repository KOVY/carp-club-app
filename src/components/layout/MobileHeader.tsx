"use client"

import Link from "next/link"
import { Fish, Menu } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher"
import { MobileMenu } from "./MobileMenu"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface User {
  id: string
  email: string
  name?: string
}

/**
 * MobileHeader - Minimal header for mobile landing page
 *
 * Shows only logo + hamburger menu for quick access to navigation.
 * Competitions are first in the menu as that's what users are looking for.
 */
export function MobileHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // Fetch user state
  useEffect(() => {
    const supabase = createClient()

    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        // Get user profile for name
        const { data: profile } = await supabase
          .from('profiles')
          .select('jmeno')
          .eq('id', authUser.id)
          .single()

        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: (profile as { jmeno: string } | null)?.jmeno || undefined,
        })
      }
    }

    fetchUser()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('jmeno')
            .eq('id', session.user.id)
            .single()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: (profile as { jmeno: string } | null)?.jmeno || undefined,
          })
        } else {
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Handle scroll for sticky effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/'
  }

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-200 glass-bar",
          isScrolled && "glass-bar-scrolled"
        )}
      >
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="animate-float-gentle inline-block">
              <Fish className="h-6 w-6 text-primary" />
            </span>
            <span className="font-bold text-lg text-foreground transition-colors">
              Carp Club
            </span>
          </Link>

          {/* Right side - Theme + Menu */}
          <div className="flex items-center space-x-2">
            <ThemeSwitcher />

            <Button
              variant="ghost"
              size="icon"
              className="text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Otevřít menu</span>
            </Button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        onSignOut={handleSignOut}
      />
    </>
  )
}
