'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Blur intensity variant
   * sm = 8px, md = 12px (default), lg = 16px
   */
  blur?: 'sm' | 'md' | 'lg'
  /**
   * Whether to add padding to the card
   */
  noPadding?: boolean
  /**
   * Whether the card is interactive (adds hover effects)
   */
  interactive?: boolean
}

/**
 * GlassCard Component
 * 
 * A glassmorphism container with backdrop-blur effect.
 * IMPORTANT: Use ONLY for containers, NEVER for primary data display.
 * Children displaying data should use DataDisplay component for solid backgrounds.
 * 
 * @example
 * <GlassCard blur="md">
 *   <DataDisplay value="12.5 kg" label="Váha" />
 * </GlassCard>
 */
const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, blur = 'md', noPadding = false, interactive = false, children, ...props }, ref) => {
    const blurClass = {
      sm: 'glass-card-sm',
      md: 'glass-card',
      lg: 'glass-card-lg',
    }[blur]

    return (
      <div
        ref={ref}
        className={cn(
          blurClass,
          !noPadding && 'p-4',
          'theme-transition',
          interactive && 'transition-all duration-fast ease-out-custom hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassCard.displayName = 'GlassCard'

/**
 * GlassCardHeader - Header section for GlassCard
 */
const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
))
GlassCardHeader.displayName = 'GlassCardHeader'

/**
 * GlassCardTitle - Title for GlassCard
 */
const GlassCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-foreground',
      className
    )}
    {...props}
  />
))
GlassCardTitle.displayName = 'GlassCardTitle'

/**
 * GlassCardDescription - Description text for GlassCard
 */
const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
GlassCardDescription.displayName = 'GlassCardDescription'

/**
 * GlassCardContent - Main content area for GlassCard
 */
const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))
GlassCardContent.displayName = 'GlassCardContent'

/**
 * GlassCardFooter - Footer section for GlassCard
 */
const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
))
GlassCardFooter.displayName = 'GlassCardFooter'

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
}
