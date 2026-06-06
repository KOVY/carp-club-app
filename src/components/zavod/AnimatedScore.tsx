"use client"

import { useCountUp } from "@/hooks/useCountUp"
import { cn } from "@/lib/utils"

interface AnimatedScoreProps {
  /** Score value to animate to */
  value: number
  /** Number of decimal places */
  decimals?: number
  /** Suffix (e.g., " kg") */
  suffix?: string
  /** Animation duration in ms */
  duration?: number
  /** Delay before animation starts */
  delay?: number
  /** Additional CSS classes */
  className?: string
  /** Key to trigger re-animation */
  animationKey?: string | number
}

/**
 * AnimatedScore - Displays a score with counting animation
 *
 * The score counts up from 0 to the target value with a smooth animation.
 * Uses useCountUp hook for smooth 60fps animation.
 */
export function AnimatedScore({
  value,
  decimals = 2,
  suffix = " kg",
  duration = 1500,
  delay = 0,
  className,
  animationKey,
}: AnimatedScoreProps) {
  const { value: displayValue, isAnimating } = useCountUp({
    end: value,
    decimals,
    suffix,
    duration,
    delay,
    easing: true,
    resetOn: animationKey,
  })

  return (
    <span
      className={cn(
        "tabular-nums transition-colors",
        isAnimating && "text-primary",
        // POZOR: className volajícího MUSÍ zůstat POSLEDNÍ – tailwind-merge nechá poslední
        // konfliktní text-color vyhrát, takže např. text-accent z leaderboardu záměrně
        // přebíjí i isAnimating "text-primary" (barva je accent i během animace). Nepřehazovat.
        className
      )}
    >
      {displayValue}
    </span>
  )
}

interface AnimatedNumberProps {
  /** Number value to animate to */
  value: number
  /** Animation duration in ms */
  duration?: number
  /** Delay before animation starts */
  delay?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * AnimatedNumber - Simple animated number without suffix
 */
export function AnimatedNumber({
  value,
  duration = 1000,
  delay = 0,
  className,
}: AnimatedNumberProps) {
  const { value: displayValue, isAnimating } = useCountUp({
    end: value,
    decimals: 0,
    suffix: "",
    duration,
    delay,
    easing: true,
  })

  return (
    <span
      className={cn(
        "tabular-nums",
        isAnimating && "text-primary",
        className
      )}
    >
      {displayValue}
    </span>
  )
}
