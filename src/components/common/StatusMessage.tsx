'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { 
  Clock, 
  EyeOff, 
  ShieldAlert, 
  AlertCircle,
  CheckCircle,
  Info,
  Loader2
} from 'lucide-react'

export type StatusMessageVariant = 
  | 'pending' 
  | 'embargo' 
  | 'unauthorized' 
  | 'error' 
  | 'success' 
  | 'info'
  | 'loading'

export interface StatusMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variant determines the icon, color, and default message
   */
  variant: StatusMessageVariant
  /**
   * Custom title (optional - uses default based on variant)
   */
  title?: string
  /**
   * Custom description/message
   */
  description?: string
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Whether to show the icon
   */
  showIcon?: boolean
  /**
   * Whether to show as inline (no background) or as a card
   */
  inline?: boolean
}

const variantConfig = {
  pending: {
    icon: Clock,
    defaultTitle: 'Čekáme na potvrzení...',
    defaultDescription: 'Váš úlovek byl zaznamenán a čeká na potvrzení rozhodčím.',
    className: 'status-message-pending',
    iconClassName: 'text-warning',
  },
  embargo: {
    icon: EyeOff,
    defaultTitle: 'Embargo aktivní',
    defaultDescription: 'Výsledky jsou dočasně skryty. Budou zveřejněny po skončení embarga.',
    className: 'status-message-embargo',
    iconClassName: 'text-embargo',
  },
  unauthorized: {
    icon: ShieldAlert,
    defaultTitle: 'Nejste oprávněni',
    defaultDescription: 'Pro tuto akci nemáte dostatečná oprávnění.',
    className: 'status-message-unauthorized',
    iconClassName: 'text-error',
  },
  error: {
    icon: AlertCircle,
    defaultTitle: 'Chyba',
    defaultDescription: 'Něco se pokazilo. Zkuste to prosím znovu.',
    className: 'status-message-error',
    iconClassName: 'text-error',
  },
  success: {
    icon: CheckCircle,
    defaultTitle: 'Úspěch',
    defaultDescription: 'Akce byla úspěšně provedena.',
    className: 'status-message-success',
    iconClassName: 'text-success',
  },
  info: {
    icon: Info,
    defaultTitle: 'Informace',
    defaultDescription: '',
    className: 'status-message-info',
    iconClassName: 'text-primary',
  },
  loading: {
    icon: Loader2,
    defaultTitle: 'Načítání...',
    defaultDescription: 'Prosím vyčkejte.',
    className: 'status-message-loading',
    iconClassName: 'text-primary animate-spin',
  },
} as const

/**
 * StatusMessage Component
 * 
 * Displays contextual status messages with appropriate styling.
 * Used for pending confirmations, embargo states, authorization errors, etc.
 * 
 * @example
 * <StatusMessage variant="pending" />
 * <StatusMessage variant="embargo" description="Embargo končí v 18:00" />
 * <StatusMessage variant="unauthorized" title="Přístup odepřen" />
 */
const StatusMessage = React.forwardRef<HTMLDivElement, StatusMessageProps>(
  (
    {
      className,
      variant,
      title,
      description,
      size = 'md',
      showIcon = true,
      inline = false,
      ...props
    },
    ref
  ) => {
    const config = variantConfig[variant]
    const Icon = config.icon

    const sizeClasses = {
      sm: {
        container: 'p-3 gap-2',
        icon: 16,
        title: 'text-sm font-medium',
        description: 'text-xs',
      },
      md: {
        container: 'p-4 gap-3',
        icon: 20,
        title: 'text-base font-medium',
        description: 'text-sm',
      },
      lg: {
        container: 'p-5 gap-4',
        icon: 24,
        title: 'text-lg font-semibold',
        description: 'text-base',
      },
    }

    const displayTitle = title || config.defaultTitle
    const displayDescription = description ?? config.defaultDescription

    if (inline) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex items-center gap-2',
            sizeClasses[size].description,
            config.iconClassName.replace('text-', 'text-'),
            className
          )}
          {...props}
        >
          {showIcon && (
            <Icon
              size={sizeClasses[size].icon - 4}
              className={cn('flex-shrink-0', config.iconClassName)}
            />
          )}
          <span>{displayTitle}</span>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border theme-transition',
          config.className,
          sizeClasses[size].container,
          'flex items-start',
          className
        )}
        {...props}
      >
        {showIcon && (
          <div className="flex-shrink-0 mt-0.5">
            <Icon
              size={sizeClasses[size].icon}
              className={config.iconClassName}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn(sizeClasses[size].title, 'text-foreground')}>
            {displayTitle}
          </p>
          {displayDescription && (
            <p className={cn(sizeClasses[size].description, 'text-muted-foreground mt-1')}>
              {displayDescription}
            </p>
          )}
        </div>
      </div>
    )
  }
)
StatusMessage.displayName = 'StatusMessage'

/**
 * PendingConfirmationMessage - Specialized component for pending catches
 */
const PendingConfirmationMessage = React.forwardRef<
  HTMLDivElement,
  Omit<StatusMessageProps, 'variant'> & { catchTime?: string }
>(({ catchTime, description, ...props }, ref) => {
  const customDescription = catchTime 
    ? `Úlovek z ${catchTime} čeká na potvrzení rozhodčím.`
    : description

  return (
    <StatusMessage
      ref={ref}
      variant="pending"
      description={customDescription}
      {...props}
    />
  )
})
PendingConfirmationMessage.displayName = 'PendingConfirmationMessage'

/**
 * EmbargoMessage - Specialized component for embargo state
 */
const EmbargoMessage = React.forwardRef<
  HTMLDivElement,
  Omit<StatusMessageProps, 'variant'> & { endTime?: string }
>(({ endTime, description, ...props }, ref) => {
  const customDescription = endTime
    ? `Výsledky budou zveřejněny ${endTime}.`
    : description

  return (
    <StatusMessage
      ref={ref}
      variant="embargo"
      description={customDescription}
      {...props}
    />
  )
})
EmbargoMessage.displayName = 'EmbargoMessage'

/**
 * UnauthorizedMessage - Specialized component for permission errors
 */
const UnauthorizedMessage = React.forwardRef<
  HTMLDivElement,
  Omit<StatusMessageProps, 'variant'> & { requiredRole?: string }
>(({ requiredRole, description, ...props }, ref) => {
  const customDescription = requiredRole
    ? `Pro tuto akci je vyžadována role: ${requiredRole}.`
    : description

  return (
    <StatusMessage
      ref={ref}
      variant="unauthorized"
      description={customDescription}
      {...props}
    />
  )
})
UnauthorizedMessage.displayName = 'UnauthorizedMessage'

export { 
  StatusMessage, 
  PendingConfirmationMessage, 
  EmbargoMessage, 
  UnauthorizedMessage 
}
