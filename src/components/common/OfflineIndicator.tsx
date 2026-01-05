'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { WifiOff, RefreshCw } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export interface OfflineIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to show the indicator (overrides automatic detection)
   */
  show?: boolean
  /**
   * Position of the banner
   */
  position?: 'top' | 'bottom'
  /**
   * Whether to show a retry button
   */
  showRetry?: boolean
  /**
   * Callback when retry is clicked
   */
  onRetry?: () => void
}

/**
 * OfflineIndicator Component
 * 
 * Displays a banner when the user is offline.
 * Uses navigator.onLine for detection and listens to online/offline events.
 * 
 * Requirements: 9.6 - WHEN je uživatel offline, THE System SHALL zobrazit indikátor stavu připojení
 * 
 * @example
 * // Auto-detection (recommended)
 * <OfflineIndicator />
 * 
 * // Manual control
 * <OfflineIndicator show={!isConnected} />
 * 
 * // With retry button
 * <OfflineIndicator showRetry onRetry={() => refetch()} />
 */
const OfflineIndicator = React.forwardRef<HTMLDivElement, OfflineIndicatorProps>(
  (
    {
      className,
      show,
      position = 'top',
      showRetry = false,
      onRetry,
      ...props
    },
    ref
  ) => {
    const { isOnline, isInitialized } = useOnlineStatus()
    const prefersReducedMotion = useReducedMotion()
    
    // Determine if we should show the indicator
    const shouldShow = show !== undefined ? show : (!isOnline && isInitialized)

    // Don't render anything if online or not initialized
    if (!shouldShow) {
      return null
    }

    const handleRetry = () => {
      if (onRetry) {
        onRetry()
      } else {
        // Default behavior: reload the page
        window.location.reload()
      }
    }

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        className={cn(
          'fixed left-0 right-0 z-[100]',
          'flex items-center justify-center gap-3',
          'px-4 py-3',
          'bg-warning/95 text-warning-foreground',
          'backdrop-blur-sm',
          'shadow-lg',
          position === 'top' ? 'top-0' : 'bottom-0',
          // Animation
          !prefersReducedMotion && 'animate-fade-in-up',
          className
        )}
        {...props}
      >
        <WifiOff className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            Jste offline
          </p>
          <p className="text-xs opacity-90">
            Zkontrolujte připojení k internetu
          </p>
        </div>

        {showRetry && (
          <button
            type="button"
            onClick={handleRetry}
            className={cn(
              'flex items-center gap-1.5',
              'px-3 py-1.5',
              'text-xs font-medium',
              'bg-warning-foreground/20 hover:bg-warning-foreground/30',
              'rounded-md',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-warning-foreground/50'
            )}
            aria-label="Zkusit znovu"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Zkusit znovu</span>
          </button>
        )}
      </div>
    )
  }
)
OfflineIndicator.displayName = 'OfflineIndicator'

export { OfflineIndicator }
