'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ZAVOD_PAGES, getPageLabel } from '@/lib/navigation-order'

interface SwipeIndicatorProps {
  /** Current page suffix (e.g., '/leaderboard', '' for main) */
  currentPage: string
  /** Base path for the competition */
  basePath: string
  /** Optional className */
  className?: string
}

/**
 * Visual indicator showing current position in swipeable pages
 * Displays dots for each page + current page name
 */
export function SwipeIndicator({
  currentPage,
  basePath,
  className,
}: SwipeIndicatorProps) {
  const currentIndex = ZAVOD_PAGES.indexOf(currentPage as typeof ZAVOD_PAGES[number])

  // Don't show if current page is not in swipeable list
  if (currentIndex === -1) {
    return null
  }

  const currentLabel = getPageLabel(currentPage)

  return (
    <div className={cn('flex flex-col items-center gap-1 py-2', className)}>
      {/* Page name */}
      <span className="text-xs text-muted-foreground font-medium">
        {currentLabel}
      </span>

      {/* Dots */}
      <div className="flex items-center gap-2">
        {ZAVOD_PAGES.map((page, index) => {
          const isActive = index === currentIndex
          const href = `${basePath}${page}`
          const label = getPageLabel(page)

          return (
            <Link
              key={page || 'home'}
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
          )
        })}
      </div>
    </div>
  )
}
