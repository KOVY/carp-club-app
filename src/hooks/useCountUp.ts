import { useState, useEffect, useRef } from 'react'

interface UseCountUpOptions {
  /** Starting value */
  start?: number
  /** End value to count up to */
  end: number
  /** Duration of animation in ms */
  duration?: number
  /** Decimal places */
  decimals?: number
  /** Suffix to append (e.g., " kg") */
  suffix?: string
  /** Whether to use easing */
  easing?: boolean
  /** Delay before starting in ms */
  delay?: number
  /** Trigger animation on this value changing */
  resetOn?: unknown
}

interface UseCountUpResult {
  /** Current displayed value (formatted string) */
  value: string
  /** Current raw number value */
  rawValue: number
  /** Whether animation is in progress */
  isAnimating: boolean
  /** Reset and restart animation */
  reset: () => void
}

/**
 * useCountUp - Animated number counter hook
 *
 * Creates a smooth counting animation from start to end value.
 * Uses requestAnimationFrame for smooth 60fps animation.
 *
 * @example
 * const { value } = useCountUp({ end: 38.5, decimals: 2, suffix: ' kg' })
 * // value: "38.50 kg" (animates from 0)
 */
export function useCountUp({
  start = 0,
  end,
  duration = 1000,
  decimals = 2,
  suffix = '',
  easing = true,
  delay = 0,
  resetOn,
}: UseCountUpOptions): UseCountUpResult {
  const [rawValue, setRawValue] = useState(start)
  const [isAnimating, setIsAnimating] = useState(false)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const resetCountRef = useRef(0)

  // Easing function (ease-out cubic)
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3)
  }

  // Format value with decimals and suffix
  const formatValue = (value: number): string => {
    return value.toFixed(decimals) + suffix
  }

  // Reset function
  const reset = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
    setRawValue(start)
    resetCountRef.current++
    startTimeRef.current = null
  }

  useEffect(() => {
    // Reset when resetOn changes
    reset()
  }, [resetOn])

  useEffect(() => {
    const currentResetCount = resetCountRef.current

    const startAnimation = () => {
      if (currentResetCount !== resetCountRef.current) return

      setIsAnimating(true)
      startTimeRef.current = null

      const animate = (timestamp: number) => {
        if (currentResetCount !== resetCountRef.current) return

        if (!startTimeRef.current) {
          startTimeRef.current = timestamp
        }

        const elapsed = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        const easedProgress = easing ? easeOutCubic(progress) : progress
        const currentValue = start + (end - start) * easedProgress

        setRawValue(currentValue)

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
          setRawValue(end) // Ensure final value is exact
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    // Start with optional delay
    const timeoutId = setTimeout(startAnimation, delay)

    return () => {
      clearTimeout(timeoutId)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [start, end, duration, easing, delay, resetCountRef.current])

  return {
    value: formatValue(rawValue),
    rawValue,
    isAnimating,
    reset,
  }
}

/**
 * useCountUpOnView - Only starts counting when element is visible
 *
 * @example
 * const { value, ref } = useCountUpOnView({ end: 100 })
 * return <span ref={ref}>{value}</span>
 */
export function useCountUpOnView(options: UseCountUpOptions) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  const countUp = useCountUp({
    ...options,
    start: isVisible ? options.start : 0,
    end: isVisible ? options.end : 0,
  })

  return { ...countUp, ref }
}
