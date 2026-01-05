'use client'

import { useState, useEffect, RefObject } from 'react'
import { useReducedMotion } from './useReducedMotion'

interface UseScrollAnimationOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

/**
 * Hook for triggering animations when element enters viewport
 * Uses Intersection Observer for performance
 * Respects prefers-reduced-motion
 * 
 * Requirements: 6.9
 */
export function useScrollAnimation(
  ref: RefObject<HTMLElement | null>,
  options: UseScrollAnimationOptions = {}
): boolean {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options
  const [isVisible, setIsVisible] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    // If reduced motion is preferred, show immediately
    if (prefersReducedMotion) {
      setIsVisible(true)
      return
    }

    const element = ref.current
    if (!element) return

    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            if (triggerOnce) {
              observer.unobserve(entry.target)
            }
          } else if (!triggerOnce) {
            setIsVisible(false)
          }
        })
      },
      {
        threshold,
        rootMargin,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref, threshold, rootMargin, triggerOnce, prefersReducedMotion])

  return isVisible
}
