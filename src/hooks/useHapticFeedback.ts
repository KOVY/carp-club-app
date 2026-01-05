'use client'

import { useCallback } from 'react'

/**
 * Haptic feedback patterns
 */
export type HapticPattern = 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy'

/**
 * Vibration patterns in milliseconds
 * [vibrate, pause, vibrate, pause, ...]
 */
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  success: [50, 50, 100], // Short-short-long for success
  warning: [100, 50, 100], // Medium-pause-medium for warning
  error: [100, 50, 100, 50, 100], // Three medium pulses for error
  light: 10, // Very short tap
  medium: 50, // Medium tap
  heavy: 100, // Strong tap
}

export interface UseHapticFeedbackReturn {
  /** Trigger haptic feedback with a pattern */
  trigger: (pattern?: HapticPattern) => void
  /** Check if haptic feedback is supported */
  isSupported: boolean
}

/**
 * Hook for triggering haptic feedback on mobile devices
 * Requirements: 3.7 - Implement haptic feedback for successful submissions and confirmations
 * 
 * Uses the Vibration API with graceful fallback when not supported
 */
export function useHapticFeedback(): UseHapticFeedbackReturn {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator

  const trigger = useCallback((pattern: HapticPattern = 'medium') => {
    if (!isSupported) return
    
    try {
      const vibrationPattern = HAPTIC_PATTERNS[pattern]
      navigator.vibrate(vibrationPattern)
    } catch (error) {
      // Silently fail if vibration is not allowed or fails
      console.debug('Haptic feedback failed:', error)
    }
  }, [isSupported])

  return {
    trigger,
    isSupported,
  }
}

/**
 * Utility function to trigger haptic feedback without hook
 * Useful for one-off triggers in event handlers
 */
export function triggerHaptic(pattern: HapticPattern = 'medium'): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  
  try {
    const vibrationPattern = HAPTIC_PATTERNS[pattern]
    navigator.vibrate(vibrationPattern)
  } catch (error) {
    // Silently fail
    console.debug('Haptic feedback failed:', error)
  }
}
