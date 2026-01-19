"use client"

import { useState, useEffect, useMemo } from "react"
import { Calendar, Fish } from "lucide-react"
import { KalendarGrid } from "@/components/kalendar/KalendarGrid"
import { ZavodList } from "@/components/kalendar/ZavodCard"
import { getZavodyForKalendar, type KalendarZavod } from "@/actions/kalendar.actions"

export default function KalendarPage() {
  const [zavody, setZavody] = useState<KalendarZavod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedZavody, setSelectedZavody] = useState<KalendarZavod[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const result = await getZavodyForKalendar()
      if (result.success && result.data) {
        setZavody(result.data)
      }
      setIsLoading(false)
    }

    fetchData()
  }, [])

  const handleDateSelect = (date: Date, dayZavody: KalendarZavod[]) => {
    setSelectedDate(date)
    setSelectedZavody(dayZavody)
  }

  // Split zavody into upcoming and past
  const { upcomingZavody, ongoingZavody } = useMemo(() => {
    const now = new Date()
    const ongoing: KalendarZavod[] = []
    const upcoming: KalendarZavod[] = []

    zavody.forEach((z) => {
      const start = new Date(z.datum_start)
      const end = new Date(z.datum_end)

      if (start <= now && end >= now) {
        ongoing.push(z)
      } else if (start > now) {
        upcoming.push(z)
      }
    })

    return {
      ongoingZavody: ongoing,
      upcomingZavody: upcoming.slice(0, 5), // Limit to 5
    }
  }, [zavody])

  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString("cs-CZ", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Calendar className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Kalendář závodů</h1>
          <p className="text-muted-foreground">
            Přehled plánovaných a probíhajících závodů
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Calendar */}
        <div>
          <KalendarGrid
            zavody={zavody}
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate}
          />

          {/* Selected date zavody */}
          {selectedDate && (
            <div className="mt-6">
              <h2 className="font-semibold text-lg mb-4">
                {formatSelectedDate(selectedDate)}
              </h2>
              {selectedZavody.length > 0 ? (
                <ZavodList
                  zavody={selectedZavody}
                  highlightedIds={selectedZavody.map(z => z.id)}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
                  <Fish className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>V tento den není naplánován žádný závod</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - upcoming zavody */}
        <div className="space-y-6">
          {/* Ongoing */}
          {ongoingZavody.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <h2 className="font-semibold text-lg">Právě probíhá</h2>
              </div>
              <ZavodList
                zavody={ongoingZavody}
                emptyMessage="Žádný závod právě neprobíhá"
              />
            </div>
          )}

          {/* Upcoming */}
          <div>
            <h2 className="font-semibold text-lg mb-4">Nadcházející závody</h2>
            <ZavodList
              zavody={upcomingZavody}
              emptyMessage="Žádné nadcházející závody"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
