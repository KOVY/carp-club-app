'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect user's reduced motion preference
 * Returns true if user prefers reduced motion
 * Requirements: 7.7
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches)

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    
    // Fallback for older browsers
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return prefersReducedMotion
}

/**
 * Returns animation duration based on reduced motion preference
 * @param normalDuration - Duration in ms when motion is allowed
 * @returns 0 if reduced motion is preferred, otherwise normalDuration
 */
export function useAnimationDuration(normalDuration: number): number {
  const prefersReducedMotion = useReducedMotion()
  return prefersReducedMotion ? 0 : normalDuration
}
