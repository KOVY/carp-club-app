'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

/**
 * PageTransition component
 * Provides fade animation for page content (max 200ms duration)
 * Respects prefers-reduced-motion
 * Requirements: 7.1
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Small delay to ensure animation triggers
    const timer = requestAnimationFrame(() => {
      setIsVisible(true)
    })
    return () => cancelAnimationFrame(timer)
  }, [])

  return (
    <div
      className={cn(
        'motion-safe:animate-page-enter',
        !isVisible && 'opacity-0',
        isVisible && 'opacity-100',
        className
      )}
    >
      {children}
    </div>
  )
}
