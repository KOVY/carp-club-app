"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fish, Menu, User, LogOut, ChevronDown } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher"
import { MobileMenu } from "./MobileMenu"
import { cn } from "@/lib/utils"

interface User {
  id: string
  email: string
  name?: string
}

interface HeaderProps {
  user?: User | null
  onSignOut?: () => void
  /** Enable floating mode with margins and rounded corners */
  floating?: boolean
}

interface NavItem {
  href: string
  label: string
  exact?: boolean
}

const navItems: NavItem[] = [
  { href: "/#zavody", label: "Závody" },
  { href: "/sezona", label: "Liga 2026" },
  { href: "/kalendar", label: "Kalendář" },
  { href: "/archiv", label: "Archiv" },
]

export function Header({ user, onSignOut, floating }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()

  // Handle scroll for sticky header with backdrop-blur
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-user-menu]')) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [userMenuOpen])

  // Check if nav item is active
  const isActive = (item: NavItem) => {
    // Handle anchor links (e.g., /#zavody)
    if (item.href.startsWith('/#')) {
      return pathname === '/'
    }
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  // Get user initials for avatar
  const getUserInitials = (user: User) => {
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return user.email[0].toUpperCase()
  }

  return (
    <header
      className={cn(
        "sticky z-50 w-full transition-all duration-200 glass-bar",
        isScrolled && "glass-bar-scrolled",
        floating
          ? "top-4 mx-4 rounded-2xl border"
          : "top-0"
      )}
    >
      <div className={cn(
        "flex h-14 items-center justify-between",
        floating ? "px-6" : "container"
      )}>
        {/* Left side - Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2 mr-8">
            <span className="animate-float-slow inline-block">
              <Fish className="h-6 w-6 text-primary" />
            </span>
            <span className="font-bold text-lg hidden sm:inline-block">
              Carp Club ČR
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150",
                  isActive(item)
                    ? "text-primary bg-primary/10 nav-active-dot"
                    : "text-foreground/60 hover:text-foreground hover:bg-accent/50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side - Theme Switcher, User Menu, Mobile Menu */}
        <div className="flex items-center space-x-2">
          <ThemeSwitcher />

          {/* Desktop User Menu / Login */}
          <nav className="hidden md:flex items-center space-x-2">
            {user ? (
              <div className="relative" data-user-menu>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                    {getUserInitials(user)}
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      userMenuOpen && "rotate-180"
                    )}
                  />
                </Button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
                    <div className="p-3 border-b">
                      <p className="text-sm font-medium truncate">
                        {user.name || user.email}
                      </p>
                      {user.name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false)
                          onSignOut?.()
                        }}
                        className="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Odhlásit se</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="ghost" asChild>
                <Link href="/login">Přihlásit se</Link>
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Otevřít menu</span>
          </Button>
        </div>
      </div>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        onSignOut={onSignOut}
      />
    </header>
  )
}
