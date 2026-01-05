'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check, Clock, X, EyeOff } from 'lucide-react'

export type StatusBadgeStatus = 'confirmed' | 'pending' | 'rejected' | 'embargo'

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Status type determines color and icon
   * - confirmed: green with checkmark
   * - pending: orange with clock
   * - rejected: red with X
   * - embargo: gray with eye-off
   */
  status: StatusBadgeStatus
  /**
   * Whether to show the status icon
   */
  showIcon?: boolean
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig = {
  confirmed: {
    label: 'Potvrzeno',
    icon: Check,
    className: 'status-badge-confirmed',
  },
  pending: {
    label: 'Čeká',
    icon: Clock,
    className: 'status-badge-pending',
  },
  rejected: {
    label: 'Zamítnuto',
    icon: X,
    className: 'status-badge-rejected',
  },
  embargo: {
    label: 'Embargo',
    icon: EyeOff,
    className: 'status-badge-embargo',
  },
} as const

/**
 * StatusBadge Component
 * 
 * Displays status with appropriate color and optional icon.
 * Colors are strictly separated from brand colors per design system.
 * 
 * @example
 * <StatusBadge status="confirmed" />
 * <StatusBadge status="pending" showIcon />
 * <StatusBadge status="rejected">Odmítnuto rozhodčím</StatusBadge>
 */
const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  (
    {
      className,
      status,
      showIcon = true,
      size = 'md',
      children,
      ...props
    },
    ref
  ) => {
    const config = statusConfig[status]
    const Icon = config.icon

    const sizeClasses = {
      sm: 'text-[10px] py-0.5 px-2',
      md: 'text-xs py-1 px-2.5',
      lg: 'text-sm py-1.5 px-3',
    }

    const iconSizes = {
      sm: 10,
      md: 12,
      lg: 14,
    }

    return (
      <span
        ref={ref}
        className={cn(
          'status-badge',
          config.className,
          sizeClasses[size],
          'inline-flex items-center gap-1.5 font-medium',
          'theme-transition',
          className
        )}
        {...props}
      >
        {showIcon && (
          <Icon
            size={iconSizes[size]}
            className="flex-shrink-0"
            strokeWidth={2.5}
          />
        )}
        {children || config.label}
      </span>
    )
  }
)
StatusBadge.displayName = 'StatusBadge'

/**
 * StatusDot - A minimal status indicator (just a colored dot)
 */
const StatusDot = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    status: StatusBadgeStatus
    size?: 'sm' | 'md' | 'lg'
    pulse?: boolean
  }
>(({ className, status, size = 'md', pulse = false, ...props }, ref) => {
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  }

  const statusColors = {
    confirmed: 'bg-success',
    pending: 'bg-warning',
    rejected: 'bg-error',
    embargo: 'bg-embargo',
  }

  return (
    <span
      ref={ref}
      className={cn(
        'inline-block rounded-full',
        dotSizes[size],
        statusColors[status],
        pulse && status === 'pending' && 'animate-pulse',
        className
      )}
      {...props}
    />
  )
})
StatusDot.displayName = 'StatusDot'

export { StatusBadge, StatusDot }
