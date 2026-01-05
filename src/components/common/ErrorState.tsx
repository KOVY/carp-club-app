'use client'

import * as React from 'react'
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, ShieldX, FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * Error types for categorizing different error scenarios
 */
export type ErrorType = 
  | 'generic'      // General error
  | 'network'      // Network/connection error
  | 'server'       // Server error (500, etc.)
  | 'notFound'     // Resource not found (404)
  | 'unauthorized' // Permission denied (401, 403)
  | 'validation'   // Validation error

interface ErrorConfig {
  icon: React.ElementType
  defaultTitle: string
  defaultMessage: string
  iconClassName: string
}

const errorConfigs: Record<ErrorType, ErrorConfig> = {
  generic: {
    icon: AlertCircle,
    defaultTitle: 'Něco se pokazilo',
    defaultMessage: 'Nepodařilo se provést požadovanou akci. Zkuste to prosím znovu.',
    iconClassName: 'text-error',
  },
  network: {
    icon: WifiOff,
    defaultTitle: 'Problém s připojením',
    defaultMessage: 'Nepodařilo se připojit k serveru. Zkontrolujte své internetové připojení a zkuste to znovu.',
    iconClassName: 'text-warning',
  },
  server: {
    icon: ServerCrash,
    defaultTitle: 'Chyba serveru',
    defaultMessage: 'Server momentálně není dostupný. Zkuste to prosím za chvíli.',
    iconClassName: 'text-error',
  },
  notFound: {
    icon: FileQuestion,
    defaultTitle: 'Nenalezeno',
    defaultMessage: 'Požadovaná stránka nebo data nebyla nalezena.',
    iconClassName: 'text-warning',
  },
  unauthorized: {
    icon: ShieldX,
    defaultTitle: 'Přístup odepřen',
    defaultMessage: 'Nemáte oprávnění k této akci. Přihlaste se nebo kontaktujte administrátora.',
    iconClassName: 'text-error',
  },
  validation: {
    icon: AlertCircle,
    defaultTitle: 'Neplatná data',
    defaultMessage: 'Zadaná data nejsou platná. Zkontrolujte formulář a zkuste to znovu.',
    iconClassName: 'text-warning',
  },
}

interface ErrorStateProps {
  /**
   * Error type determines the icon and default messages
   */
  type?: ErrorType
  /**
   * Custom title (overrides default based on type)
   */
  title?: string
  /**
   * Custom message (overrides default based on type)
   */
  message?: string
  /**
   * Callback function for retry action
   */
  onRetry?: () => void
  /**
   * Whether retry is currently in progress
   */
  isRetrying?: boolean
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Whether to show as inline (compact) or full card
   */
  inline?: boolean
}

/**
 * ErrorState Component
 * 
 * Displays user-friendly error messages with appropriate styling and retry functionality.
 * Supports different error types with contextual icons and messages.
 * 
 * Requirements: 9.4 - Srozumitelné chybové zprávy s možností opakování akce
 * 
 * @example
 * <ErrorState type="network" onRetry={() => refetch()} />
 * <ErrorState type="server" title="Chyba při ukládání" message="Nepodařilo se uložit úlovek." />
 * <ErrorState message="Závod nebyl nalezen" onRetry={fetchData} />
 */
export function ErrorState({
  type = 'generic',
  title,
  message,
  onRetry,
  isRetrying = false,
  className,
  size = 'md',
  inline = false,
}: ErrorStateProps) {
  const config = errorConfigs[type]
  const Icon = config.icon
  
  const displayTitle = title || config.defaultTitle
  const displayMessage = message || config.defaultMessage

  const sizeClasses = {
    sm: {
      card: 'p-4',
      iconContainer: 'h-10 w-10',
      icon: 'h-5 w-5',
      title: 'text-base',
      description: 'text-sm',
      button: 'h-8 text-sm',
    },
    md: {
      card: 'p-6',
      iconContainer: 'h-12 w-12',
      icon: 'h-6 w-6',
      title: 'text-lg',
      description: 'text-sm',
      button: 'h-9',
    },
    lg: {
      card: 'p-8',
      iconContainer: 'h-16 w-16',
      icon: 'h-8 w-8',
      title: 'text-xl',
      description: 'text-base',
      button: 'h-10',
    },
  }

  // Inline variant - compact display
  if (inline) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border theme-transition',
          'bg-[hsla(var(--error),0.1)] border-[hsla(var(--error),0.3)]',
          className
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', config.iconClassName)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{displayTitle}</p>
          {displayMessage && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{displayMessage}</p>
          )}
        </div>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="flex-shrink-0"
          >
            <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
          </Button>
        )}
      </div>
    )
  }

  // Full card variant
  return (
    <Card className={cn('border-[hsla(var(--error),0.3)] theme-transition', sizeClasses[size].card, className)}>
      <CardHeader className="text-center pb-2">
        <div className={cn(
          'mx-auto mb-4 flex items-center justify-center rounded-full',
          'bg-[hsla(var(--error),0.1)]',
          sizeClasses[size].iconContainer
        )}>
          <Icon className={cn(sizeClasses[size].icon, config.iconClassName)} />
        </div>
        <CardTitle className={cn('text-foreground', sizeClasses[size].title)}>
          {displayTitle}
        </CardTitle>
        <CardDescription className={cn('mt-2', sizeClasses[size].description)}>
          {displayMessage}
        </CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className={cn(
              'hover-scale',
              sizeClasses[size].button
            )}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isRetrying && 'animate-spin')} />
            {isRetrying ? 'Načítání...' : 'Zkusit znovu'}
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * ErrorMessage Component
 * 
 * Compact inline error message for form fields and small spaces.
 */
interface ErrorMessageProps {
  message: string
  className?: string
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-error', className)}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

/**
 * NetworkError - Specialized component for network/connection errors
 */
interface NetworkErrorProps extends Omit<ErrorStateProps, 'type'> {}

export function NetworkError(props: NetworkErrorProps) {
  return <ErrorState type="network" {...props} />
}

/**
 * ServerError - Specialized component for server errors
 */
interface ServerErrorProps extends Omit<ErrorStateProps, 'type'> {}

export function ServerError(props: ServerErrorProps) {
  return <ErrorState type="server" {...props} />
}

/**
 * NotFoundError - Specialized component for 404 errors
 */
interface NotFoundErrorProps extends Omit<ErrorStateProps, 'type'> {}

export function NotFoundError(props: NotFoundErrorProps) {
  return <ErrorState type="notFound" {...props} />
}

/**
 * UnauthorizedError - Specialized component for permission errors
 */
interface UnauthorizedErrorProps extends Omit<ErrorStateProps, 'type'> {}

export function UnauthorizedError(props: UnauthorizedErrorProps) {
  return <ErrorState type="unauthorized" {...props} />
}
