'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type DataDisplayStatus = 'confirmed' | 'pending' | 'rejected' | 'embargo' | 'default'
export type DataDisplaySize = 'sm' | 'md' | 'lg'

export interface DataDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The value to display (weight, ranking, time, etc.)
   */
  value: string | number
  /**
   * Optional label above the value
   */
  label?: string
  /**
   * Status affects the accent color (border/indicator)
   */
  status?: DataDisplayStatus
  /**
   * Size variant
   * sm = smaller text, md = default, lg = larger text
   */
  size?: DataDisplaySize
  /**
   * Whether to use monospace font (recommended for numbers)
   */
  mono?: boolean
  /**
   * Optional unit suffix (kg, cm, etc.)
   */
  unit?: string
}

/**
 * DataDisplay Component
 * 
 * Displays primary data (weights, rankings, times) with solid background
 * and high contrast for excellent readability in all conditions.
 * 
 * IMPORTANT: Always use this component for data inside GlassCard containers.
 * Never apply glassmorphism effects directly to data elements.
 * 
 * @example
 * <DataDisplay value="12.5" unit="kg" label="Váha" status="confirmed" />
 * <DataDisplay value={1} label="Pořadí" size="lg" />
 */
const DataDisplay = React.forwardRef<HTMLDivElement, DataDisplayProps>(
  (
    {
      className,
      value,
      label,
      status = 'default',
      size = 'md',
      mono = true,
      unit,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'text-sm py-1 px-2',
      md: 'text-base py-2 px-3',
      lg: 'text-xl py-3 px-4',
    }

    const valueSizeClasses = {
      sm: 'text-base',
      md: 'text-lg',
      lg: 'text-2xl',
    }

    const statusBorderClasses = {
      default: 'border-border',
      confirmed: 'border-success/50',
      pending: 'border-warning/50',
      rejected: 'border-error/50',
      embargo: 'border-embargo/50',
    }

    const statusIndicatorClasses = {
      default: '',
      confirmed: 'bg-success',
      pending: 'bg-warning',
      rejected: 'bg-error',
      embargo: 'bg-embargo',
    }

    return (
      <div
        ref={ref}
        className={cn(
          // Solid background for high contrast - NEVER transparent
          'bg-surface rounded-md border',
          sizeClasses[size],
          statusBorderClasses[status],
          'theme-transition',
          className
        )}
        {...props}
      >
        {/* Status indicator dot */}
        {status !== 'default' && (
          <div className="flex items-center gap-2 mb-1">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                statusIndicatorClasses[status]
              )}
            />
            {label && (
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {label}
              </span>
            )}
          </div>
        )}

        {/* Label without status */}
        {status === 'default' && label && (
          <span className="block text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {label}
          </span>
        )}

        {/* Value */}
        <div
          className={cn(
            'font-semibold text-foreground',
            valueSizeClasses[size],
            mono && 'font-mono'
          )}
        >
          {value}
          {unit && (
            <span className="text-muted-foreground font-normal ml-1 text-[0.8em]">
              {unit}
            </span>
          )}
        </div>
      </div>
    )
  }
)
DataDisplay.displayName = 'DataDisplay'

/**
 * DataDisplayGroup - Groups multiple DataDisplay components
 */
const DataDisplayGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    direction?: 'row' | 'column'
  }
>(({ className, direction = 'row', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex gap-3',
      direction === 'column' ? 'flex-col' : 'flex-row flex-wrap',
      className
    )}
    {...props}
  />
))
DataDisplayGroup.displayName = 'DataDisplayGroup'

export { DataDisplay, DataDisplayGroup }
