'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ZAVOD_PAGES, getPageLabel } from '@/lib/navigation-order'

// Stránky pro veřejnost (bez přihlášení)
const PUBLIC_PAGES = ['', '/leaderboard', '/galerie', '/pravidla'] as const

interface SwipeIndicatorProps {
  /** Current page suffix (e.g., '/leaderboard', '' for main) */
  currentPage: string
  /** Base path for the competition */
  basePath: string
  /** Is user authenticated? Changes indicator style */
  isAuthenticated?: boolean
  /** Team name to display for authenticated users */
  teamName?: string
  /** User role */
  userRole?: string
  /** Optional className */
  className?: string
}

/**
 * Visual indicator showing current position in swipeable pages
 * - Závodníci: tečky ● ○ ○ ○ ○
 * - Veřejnost: tečky s čárkami ○ ─ ○ ─ ○ (vizuálně oddělené)
 */
export function SwipeIndicator({
  currentPage,
  basePath,
  isAuthenticated = false,
  teamName,
  userRole,
  className,
}: SwipeIndicatorProps) {
  // Použij různé stránky pro veřejnost a závodníky
  const pages = isAuthenticated ? ZAVOD_PAGES : PUBLIC_PAGES
  // Použij findIndex pro bezpečné hledání bez type assertion
  const currentIndex = (pages as readonly string[]).indexOf(currentPage)

  // Don't show if current page is not in swipeable list
  if (currentIndex === -1) {
    return null
  }

  const currentLabel = getPageLabel(currentPage)

  return (
    <div className={cn('flex flex-col items-center gap-1 py-2', className)}>
      {/* Page name + team badge or public indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">
          {currentLabel}
        </span>
        {isAuthenticated && teamName ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
            {teamName}{userRole === 'kapitan' ? ' (K)' : ''}
          </span>
        ) : !isAuthenticated ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            veřejný přehled
          </span>
        ) : null}
      </div>

      {/* Dots - different style for public vs authenticated */}
      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          const isActive = index === currentIndex
          const href = `${basePath}${page}`
          const label = getPageLabel(page)
          const isLast = index === pages.length - 1

          return (
            <div key={page || 'home'} className="flex items-center">
              <Link
                href={href}
                className={cn(
                  'transition-all duration-200 rounded-full',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  isActive
                    ? 'w-2.5 h-2.5 bg-primary'
                    : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              />
              {/* Čárka mezi tečkami pro veřejnost */}
              {!isAuthenticated && !isLast && (
                <span className="w-2 h-px bg-muted-foreground/20 mx-0.5" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
