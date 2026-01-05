'use client'

import { ReactNode } from 'react'
import { useSwipeGesture, type SwipeGestureOptions } from '@/hooks/useSwipeGesture'
import { cn } from '@/lib/utils'

export interface SwipeableContainerProps extends SwipeGestureOptions {
  children: ReactNode
  className?: string
  /** Show visual indicator during swipe */
  showIndicator?: boolean
}

/**
 * Container component that enables swipe gestures
 * Requirements: 8.2 - Implement swipe gestures for navigation
 */
export function SwipeableContainer({
  children,
  className,
  showIndicator = false,
  ...swipeOptions
}: SwipeableContainerProps) {
  const { ref, state, handlers } = useSwipeGesture(swipeOptions)

  return (
    <div
      ref={ref}
      className={cn('relative touch-pan-y', className)}
      {...handlers}
    >
      {children}
      
      {/* Swipe indicator */}
      {showIndicator && state.isSwiping && state.direction && (
        <div 
          className={cn(
            'absolute inset-y-0 w-1 bg-primary/50 transition-opacity',
            state.direction === 'left' && 'right-0',
            state.direction === 'right' && 'left-0',
          )}
          style={{
            opacity: Math.min(state.distance / 100, 1),
          }}
        />
      )}
    </div>
  )
}
