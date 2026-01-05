'use client'

import { useState, useEffect, useCallback } from 'react'

export interface UseOnlineStatusReturn {
  /**
   * Whether the browser is currently online
   */
  isOnline: boolean
  /**
   * Whether the status has been checked at least once
   */
  isInitialized: boolean
}

/**
 * Hook to detect online/offline status using navigator.onLine
 * 
 * Listens to 'online' and 'offline' events to track connectivity changes.
 * 
 * @example
 * const { isOnline, isInitialized } = useOnlineStatus()
 * 
 * if (!isOnline) {
 *   return <OfflineBanner />
 * }
 * 
 * @returns {UseOnlineStatusReturn} Online status and initialization state
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  // Initialize with true to avoid flash of offline banner on SSR
  const [isOnline, setIsOnline] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
  }, [])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
  }, [])

  useEffect(() => {
    // Check if navigator is available (client-side only)
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      setIsOnline(navigator.onLine)
      setIsInitialized(true)

      // Add event listeners for online/offline events
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [handleOnline, handleOffline])

  return { isOnline, isInitialized }
}
