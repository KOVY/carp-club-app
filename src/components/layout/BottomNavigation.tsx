"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Trophy, Plus, CheckCircle, User, Image as ImageIcon, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/lib/types"

interface BottomNavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  badge?: number
  isHighlighted?: boolean
  /** Roles that can see this item - if undefined, visible to all */
  roles?: UserRole[]
}

interface BottomNavigationProps {
  /** Optional závod ID for context-aware navigation */
  zavodId?: string
  /** User's role in the závod */
  userRole?: UserRole | null
  /** Number of pending confirmations to show as badge */
  pendingCount?: number
  /** Whether user is authenticated */
  isAuthenticated?: boolean
  /** Custom class name */
  className?: string
}

export function BottomNavigation({
  zavodId,
  userRole,
  pendingCount = 0,
  isAuthenticated = false,
  className,
}: BottomNavigationProps) {
  const pathname = usePathname()

  // Check if user has one of the specified roles
  const hasRole = (roles: UserRole[] | undefined): boolean => {
    if (!roles) return true // No restriction, visible to all
    if (!userRole) return false
    return roles.includes(userRole)
  }

  // Build navigation items based on context
  const getNavItems = (): BottomNavItem[] => {
    if (zavodId) {
      // Context-aware navigation when in a závod
      // VEŘEJNOST (nepřihlášení) vidí zjednodušenou navigaci
      if (!isAuthenticated) {
        return [
          {
            icon: Home,
            label: "Přehled",
            href: `/zavod/${zavodId}`,
          },
          {
            icon: Trophy,
            label: "Pořadí",
            href: `/zavod/${zavodId}/leaderboard`,
          },
          {
            icon: ImageIcon,
            label: "Galerie",
            href: `/zavod/${zavodId}/galerie`,
          },
          {
            icon: FileText,
            label: "Pravidla",
            href: `/zavod/${zavodId}/pravidla`,
          },
        ]
      }

      // ZÁVODNÍCI (přihlášení) - plná navigace
      const allItems: BottomNavItem[] = [
        {
          icon: Home,
          label: "Domů",
          href: `/zavod/${zavodId}`,
        },
        {
          icon: Trophy,
          label: "Pořadí",
          href: `/zavod/${zavodId}/leaderboard`,
        },
        // "Přidat úlovek" - jen pro přihlášené s rolí
        {
          icon: Plus,
          label: "Přidat",
          href: `/zavod/${zavodId}/ulovky`,
          isHighlighted: true,
          roles: ['zavodnik', 'kapitan', 'rozhodci', 'poradatel'],
        },
        // "Potvrzení" - pro závodníky a kapitány
        {
          icon: CheckCircle,
          label: "Potvrzení",
          href: `/zavod/${zavodId}/potvrzeni`,
          badge: pendingCount > 0 ? pendingCount : undefined,
          roles: ['zavodnik', 'kapitan', 'rozhodci', 'poradatel'],
        },
        // Galerie pro všechny přihlášené
        {
          icon: ImageIcon,
          label: "Galerie",
          href: `/zavod/${zavodId}/galerie`,
        },
        {
          icon: User,
          label: "Profil",
          href: "/profil",
        },
      ]

      // Filter items based on role
      return allItems.filter(item => hasRole(item.roles))
    }

    // Default navigation when not in závod context
    const defaultItems: BottomNavItem[] = [
      {
        icon: Home,
        label: "Domů",
        href: "/",
      },
      {
        icon: Trophy,
        label: "Liga",
        href: "/sezona",
        isHighlighted: true,
      },
      {
        icon: ImageIcon,
        label: "Archiv",
        href: "/archiv",
      },
      // Admin only for organizers/admins
      {
        icon: CheckCircle,
        label: "Admin",
        href: "/admin",
        roles: ['poradatel', 'hlavni_admin'],
      },
      {
        icon: User,
        label: isAuthenticated ? "Účet" : "Mám účet",
        href: isAuthenticated ? "/profil" : "/login",
      },
    ]

    return defaultItems.filter(item => hasRole(item.roles))
  }

  const navItems = getNavItems()

  // Check if nav item is active
  const isActive = (href: string) => {
    if (href === "/" || href === `/zavod/${zavodId}`) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-surface border-t border-border",
        "pb-[env(safe-area-inset-bottom)]",
        className
      )}
      role="navigation"
      aria-label="Hlavní mobilní navigace"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          if (item.isHighlighted) {
            // Highlighted "Přidat úlovek" button
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center",
                  "w-14 h-14 -mt-5",
                  "bg-accent text-accent-foreground",
                  "rounded-full shadow-lg",
                  "transition-transform duration-150 ease-out",
                  "hover:scale-105 active:scale-95",
                  "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                )}
                aria-label={item.label}
              >
                <Icon className="h-6 w-6" />
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "min-w-[44px] min-h-[44px] px-3 py-2",
                "transition-colors duration-150 ease-out",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {/* Badge for pending confirmations */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1",
                      "min-w-[18px] h-[18px] px-1",
                      "flex items-center justify-center",
                      "bg-error text-white",
                      "text-[11px] font-semibold",
                      "rounded-full"
                    )}
                    aria-label={`${item.badge} čekajících`}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNavigation
