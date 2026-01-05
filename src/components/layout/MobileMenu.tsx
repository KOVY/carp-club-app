"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { X, Fish, Home, Archive, LogIn, LogOut, Trophy, CheckCircle, Image as ImageIcon, FileText, Settings, Users, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface User {
  id: string
  email: string
  name?: string
}

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  user?: User | null
  onSignOut?: () => void
  /** Optional závod context for contextual navigation */
  zavodId?: string
  /** User's role in the závod */
  userRole?: 'zavodnik' | 'kapitan' | 'rozhodci' | 'poradatel' | 'divak' | null
  /** Number of pending confirmations */
  pendingCount?: number
}

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
  badge?: number
  roles?: string[]
}

export function MobileMenu({ 
  open, 
  onClose, 
  user, 
  onSignOut,
  zavodId,
  userRole,
  pendingCount = 0,
}: MobileMenuProps) {
  const pathname = usePathname()
  const [isAnimating, setIsAnimating] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  // Handle animation states
  useEffect(() => {
    if (open) {
      setShouldRender(true)
      // Small delay to trigger animation
      requestAnimationFrame(() => {
        setIsAnimating(true)
      })
    } else {
      setIsAnimating(false)
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 300) // Match animation duration
      return () => clearTimeout(timer)
    }
  }, [open])

  // Build navigation items based on context
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      { href: "/", label: "Závody", icon: Home, exact: true },
      { href: "/archiv", label: "Archiv", icon: Archive },
    ]

    if (zavodId) {
      // Add závod-specific navigation
      const zavodItems: NavItem[] = [
        { href: `/zavod/${zavodId}`, label: "Přehled závodu", icon: Fish, exact: true },
        { href: `/zavod/${zavodId}/leaderboard`, label: "Pořadí", icon: Trophy },
        { href: `/zavod/${zavodId}/galerie`, label: "Galerie", icon: ImageIcon },
        { href: `/zavod/${zavodId}/pravidla`, label: "Pravidla", icon: FileText },
        { href: `/zavod/${zavodId}/verejnost`, label: "Veřejný přehled", icon: Eye },
      ]

      // Add role-specific items
      if (userRole && ['kapitan', 'rozhodci', 'poradatel'].includes(userRole)) {
        zavodItems.push({
          href: `/zavod/${zavodId}/ulovky`,
          label: "Úlovky",
          icon: Fish,
          roles: ['kapitan', 'rozhodci', 'poradatel'],
        })
      }

      if (userRole && ['rozhodci', 'poradatel'].includes(userRole)) {
        zavodItems.push({
          href: `/zavod/${zavodId}/admin`,
          label: "Potvrzení",
          icon: CheckCircle,
          badge: pendingCount > 0 ? pendingCount : undefined,
          roles: ['rozhodci', 'poradatel'],
        })
        zavodItems.push({
          href: `/zavod/${zavodId}/admin`,
          label: "Rozhodčí",
          icon: Users,
          roles: ['rozhodci', 'poradatel'],
        })
      }

      if (userRole === 'poradatel') {
        zavodItems.push({
          href: `/zavod/${zavodId}/admin/nastaveni`,
          label: "Nastavení",
          icon: Settings,
          roles: ['poradatel'],
        })
      }

      return [...baseItems, ...zavodItems]
    }

    return baseItems
  }

  const navItems = getNavItems()

  // Check if nav item is active
  const isActive = (item: NavItem) => {
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

  if (!shouldRender) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop with fade animation */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Menu panel with slide animation */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 w-full max-w-xs bg-background shadow-lg transition-transform duration-300 ease-out",
          isAnimating ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <Fish className="h-5 w-5 text-primary" />
              <span className="font-semibold">Menu</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="hover:bg-accent/50 transition-colors duration-150"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Zavřít menu</span>
            </Button>
          </div>

          {/* User info (if logged in) */}
          {user && (
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                  {getUserInitials(user)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name || user.email}
                  </p>
                  {user.name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {zavodId && (
              <div className="pb-2 mb-2 border-b">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
                  Hlavní
                </p>
              </div>
            )}
            
            {navItems.slice(0, 2).map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-150",
                    isActive(item)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/80 hover:bg-accent/50"
                  )}
                  onClick={onClose}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            {zavodId && navItems.length > 2 && (
              <>
                <div className="pt-4 pb-2 mb-2 border-b">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
                    Závod
                  </p>
                </div>
                
                {navItems.slice(2).map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-150",
                        isActive(item)
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground/80 hover:bg-accent/50"
                      )}
                      onClick={onClose}
                    >
                      <div className="relative">
                        <Icon className="h-5 w-5" />
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-error text-white text-[10px] font-semibold rounded-full">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </div>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </>
            )}
          </nav>
          
          {/* Footer */}
          <div className="p-4 border-t">
            {user ? (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
                onClick={() => {
                  onClose()
                  onSignOut?.()
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Odhlásit se
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link href="/login" onClick={onClose}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Přihlásit se
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
