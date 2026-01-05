'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type SkeletonVariant = 'text' | 'card' | 'avatar' | 'table-row'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variant determines the shape and size
   * - text: single line of text
   * - card: rectangular card shape
   * - avatar: circular avatar
   * - table-row: full table row with multiple cells
   */
  variant?: SkeletonVariant
  /**
   * Number of skeleton items to render
   */
  count?: number
  /**
   * Width (for text variant)
   */
  width?: string | number
  /**
   * Height (for card variant)
   */
  height?: string | number
}

/**
 * Base skeleton element with pulse animation
 * Respects prefers-reduced-motion automatically via CSS
 * Requirements: 7.3, 7.7
 */
const SkeletonBase = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'bg-muted rounded-md',
      // Animation class - disabled by prefers-reduced-motion in globals.css
      'motion-safe:animate-pulse-skeleton',
      // Fallback for reduced motion - static background
      'motion-reduce:opacity-70',
      className
    )}
    {...props}
  />
))
SkeletonBase.displayName = 'SkeletonBase'

/**
 * SkeletonText - Single line text placeholder
 */
const SkeletonText = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { width?: string | number }
>(({ className, width, style, ...props }, ref) => (
  <SkeletonBase
    ref={ref}
    className={cn('h-4', className)}
    style={{ width: width || '100%', ...style }}
    {...props}
  />
))
SkeletonText.displayName = 'SkeletonText'

/**
 * SkeletonCard - Card placeholder
 */
const SkeletonCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    height?: string | number
  }
>(({ className, height = 120, style, ...props }, ref) => (
  <SkeletonBase
    ref={ref}
    className={cn('w-full rounded-lg', className)}
    style={{ height, ...style }}
    {...props}
  />
))
SkeletonCard.displayName = 'SkeletonCard'

/**
 * SkeletonAvatar - Circular avatar placeholder
 */
const SkeletonAvatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: 'sm' | 'md' | 'lg'
  }
>(({ className, size = 'md', ...props }, ref) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  return (
    <SkeletonBase
      ref={ref}
      className={cn('rounded-full', sizeClasses[size], className)}
      {...props}
    />
  )
})
SkeletonAvatar.displayName = 'SkeletonAvatar'

/**
 * SkeletonTableRow - Table row placeholder with multiple cells
 */
const SkeletonTableRow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    columns?: number
  }
>(({ className, columns = 4, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-4 py-3', className)}
    {...props}
  >
    {Array.from({ length: columns }).map((_, i) => (
      <SkeletonBase
        key={i}
        className="h-4 flex-1"
        style={{
          // Vary widths for more natural look
          maxWidth: i === 0 ? '40%' : i === columns - 1 ? '20%' : '30%',
        }}
      />
    ))}
  </div>
))
SkeletonTableRow.displayName = 'SkeletonTableRow'

/**
 * SkeletonLoader Component
 * 
 * Displays loading placeholders with pulse animation.
 * Automatically respects prefers-reduced-motion preference.
 * 
 * @example
 * <SkeletonLoader variant="text" count={3} />
 * <SkeletonLoader variant="card" height={200} />
 * <SkeletonLoader variant="avatar" />
 * <SkeletonLoader variant="table-row" count={5} />
 */
const SkeletonLoader = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = 'text',
      count = 1,
      width,
      height,
      ...props
    },
    ref
  ) => {
    const items = Array.from({ length: count })

    const renderSkeleton = (index: number) => {
      switch (variant) {
        case 'text':
          return (
            <SkeletonText
              key={index}
              width={width}
              // Vary last item width for natural look
              style={{
                width:
                  index === count - 1 && count > 1
                    ? '60%'
                    : width || '100%',
              }}
            />
          )
        case 'card':
          return <SkeletonCard key={index} height={height} />
        case 'avatar':
          return <SkeletonAvatar key={index} />
        case 'table-row':
          return <SkeletonTableRow key={index} />
        default:
          return <SkeletonText key={index} />
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          'space-y-3',
          variant === 'avatar' && 'flex gap-3 space-y-0',
          className
        )}
        {...props}
      >
        {items.map((_, index) => renderSkeleton(index))}
      </div>
    )
  }
)
SkeletonLoader.displayName = 'SkeletonLoader'

/**
 * Skeleton - Simple inline skeleton (alias for SkeletonBase)
 */
const Skeleton = SkeletonBase

export {
  SkeletonLoader,
  Skeleton,
  SkeletonBase,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonTableRow,
}
