'use client'

import { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { usePullToRefresh, type PullToRefreshOptions } from '@/hooks/usePullToRefresh'
import { cn } from '@/lib/utils'

export interface PullToRefreshProps extends Omit<PullToRefreshOptions, 'onRefresh'> {
  children: ReactNode
  className?: string
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>
}

/**
 * Pull-to-refresh container component
 * Requirements: 8.6 - Support pull-to-refresh for data updates
 */
export function PullToRefresh({
  children,
  className,
  onRefresh,
  ...options
}: PullToRefreshProps) {
  const { containerRef, state, handlers } = usePullToRefresh({
    onRefresh,
    ...options,
  })

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      {...handlers}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 z-10 transition-opacity duration-200',
          (state.isPulling || state.isRefreshing) ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          top: Math.max(0, state.pullDistance - 40),
        }}
      >
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full bg-background border shadow-md',
          state.isRefreshing && 'animate-pulse'
        )}>
          <RefreshCw 
            className={cn(
              'h-5 w-5 text-primary transition-transform duration-200',
              state.isRefreshing && 'animate-spin'
            )}
            style={{
              transform: state.isRefreshing 
                ? undefined 
                : `rotate(${state.progress * 360}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: state.pullDistance > 0 
            ? `translateY(${state.pullDistance}px)` 
            : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
