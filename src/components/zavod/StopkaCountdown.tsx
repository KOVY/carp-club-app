"use client"

import { useState, useEffect } from "react"
import { Clock, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface StopkaCountdownProps {
  /** ISO timestamp when the stopka ends */
  stopkaDo: string
  /** Optional callback when stopka expires */
  onExpired?: () => void
  /** Optional className */
  className?: string
  /** Compact display mode */
  compact?: boolean
}

/**
 * StopkaCountdown - Displays a countdown timer for penalty timeout
 *
 * Shows remaining time until a team can submit catches again after receiving a yellow card with stopka.
 */
export function StopkaCountdown({
  stopkaDo,
  onExpired,
  className,
  compact = false,
}: StopkaCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number
    minutes: number
    seconds: number
    total: number
  } | null>(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const endTime = new Date(stopkaDo).getTime()
      const now = new Date().getTime()
      const difference = endTime - now

      if (difference <= 0) {
        setIsExpired(true)
        setTimeLeft(null)
        onExpired?.()
        return null
      }

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds, total: difference })
      setIsExpired(false)
      return difference
    }

    // Initial calculation
    calculateTimeLeft()

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft()
      if (remaining === null || remaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [stopkaDo, onExpired])

  // Don't render if expired
  if (isExpired) {
    return null
  }

  // Loading state
  if (timeLeft === null) {
    return null
  }

  const formatNumber = (n: number) => n.toString().padStart(2, "0")

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full",
          "bg-red-500/10 text-red-600 border border-red-500/20",
          "text-sm font-medium",
          className
        )}
      >
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        <span className="font-mono">
          {formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "p-4 rounded-lg",
        "bg-red-500/10 border border-red-500/20",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-red-500/20">
          <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-red-700 dark:text-red-400">
            Stopka - zákaz chytání
          </h4>
          <p className="text-sm text-red-600/80 mt-1">
            Tým nemůže zadávat úlovky po dobu trvání stopky
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-red-500" />
            <span className="text-lg font-mono font-bold text-red-600">
              {formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
            </span>
            <span className="text-sm text-red-500">zbývá</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to check if a team has an active stopka
 */
export function useActiveStopka(stopkaDo: string | null | undefined): boolean {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (!stopkaDo) {
      setIsActive(false)
      return
    }

    const checkStopka = () => {
      const endTime = new Date(stopkaDo).getTime()
      const now = new Date().getTime()
      setIsActive(endTime > now)
    }

    // Initial check
    checkStopka()

    // Check every second
    const interval = setInterval(checkStopka, 1000)

    return () => clearInterval(interval)
  }, [stopkaDo])

  return isActive
}
