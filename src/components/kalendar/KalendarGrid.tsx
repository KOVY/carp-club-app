"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { KalendarZavod } from "@/actions/kalendar.actions"

interface KalendarGridProps {
  zavody: KalendarZavod[]
  onDateSelect?: (date: Date, zavody: KalendarZavod[]) => void
  selectedDate?: Date | null
}

const DAYS_OF_WEEK = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"]
const MONTHS = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
]

export function KalendarGrid({
  zavody,
  onDateSelect,
  selectedDate,
}: KalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const { year, month, days, firstDayOffset } = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    const firstDayOffset = firstDay === 0 ? 6 : firstDay - 1

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

    return { year, month, days, firstDayOffset }
  }, [currentDate])

  // Map of day -> zavody
  const zavodByDay = useMemo(() => {
    const map = new Map<number, KalendarZavod[]>()

    zavody.forEach((zavod) => {
      const startDate = new Date(zavod.datum_start)
      const endDate = new Date(zavod.datum_end)

      // Check if zavod falls within current month
      if (
        (startDate.getFullYear() === year && startDate.getMonth() === month) ||
        (endDate.getFullYear() === year && endDate.getMonth() === month) ||
        (startDate < new Date(year, month, 1) && endDate > new Date(year, month + 1, 0))
      ) {
        // Add to each day the zavod spans
        const monthStart = new Date(year, month, 1)
        const monthEnd = new Date(year, month + 1, 0)

        const effectiveStart = startDate < monthStart ? monthStart : startDate
        const effectiveEnd = endDate > monthEnd ? monthEnd : endDate

        for (let d = effectiveStart.getDate(); d <= effectiveEnd.getDate(); d++) {
          const existing = map.get(d) || []
          if (!existing.find(z => z.id === zavod.id)) {
            map.set(d, [...existing, zavod])
          }
        }
      }
    })

    return map
  }, [zavody, year, month])

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(year, month + direction, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    )
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    )
  }

  const handleDayClick = (day: number) => {
    const date = new Date(year, month, day)
    const dayZavody = zavodByDay.get(day) || []
    onDateSelect?.(date, dayZavody)
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateMonth(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {MONTHS[month]} {year}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-xs"
          >
            Dnes
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateMonth(1)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="h-12 md:h-16" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dayZavody = zavodByDay.get(day) || []
          const hasZavody = dayZavody.length > 0

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={cn(
                "h-12 md:h-16 rounded-md relative transition-colors",
                "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring",
                isToday(day) && "bg-primary/10 font-bold",
                isSelected(day) && "bg-primary text-primary-foreground",
                hasZavody && !isSelected(day) && "bg-accent"
              )}
            >
              <span className={cn(
                "text-sm",
                isSelected(day) && "text-primary-foreground"
              )}>
                {day}
              </span>

              {/* Závod indicator dots */}
              {hasZavody && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayZavody.slice(0, 3).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected(day) ? "bg-primary-foreground" : "bg-primary"
                      )}
                    />
                  ))}
                  {dayZavody.length > 3 && (
                    <span className={cn(
                      "text-[10px]",
                      isSelected(day) ? "text-primary-foreground" : "text-primary"
                    )}>
                      +{dayZavody.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Závod</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary/30 border border-primary" />
          <span>Dnes</span>
        </div>
      </div>
    </div>
  )
}
