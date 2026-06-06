"use client"

import Link from "next/link"
import { Calendar, MapPin, Users, ChevronRight, Fish, Clock, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { KalendarZavod } from "@/actions/kalendar.actions"

interface ZavodCardProps {
  zavod: KalendarZavod
  highlighted?: boolean
}

export function ZavodCard({ zavod, highlighted }: ZavodCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)

    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(start)
    }

    // Same month and year
    if (
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getFullYear() === endDate.getFullYear()
    ) {
      return `${startDate.getDate()}. - ${endDate.getDate()}. ${startDate.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" })}`
    }

    return `${formatDate(start)} - ${formatDate(end)}`
  }

  const getStatusBadge = (stav: string) => {
    switch (stav) {
      case "probiha":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <Fish className="h-3 w-3 mr-1" />
            Probíhá
          </Badge>
        )
      case "ukoncen":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ukončen
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Příprava
          </Badge>
        )
    }
  }

  const isUpcoming = new Date(zavod.datum_start) > new Date()
  const isOngoing = new Date(zavod.datum_start) <= new Date() && new Date(zavod.datum_end) >= new Date()

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        highlighted && "ring-2 ring-primary",
        isOngoing && "border-green-500/50"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Fish className="h-5 w-5 text-primary shrink-0" />
              <h3 className="font-semibold text-lg truncate">{zavod.nazev}</h3>
            </div>

            <div className="space-y-1.5 text-sm text-muted-foreground">
              {zavod.misto && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{zavod.misto}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>{formatDateRange(zavod.datum_start, zavod.datum_end)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" />
                <span>{zavod.pocet_tymu} týmů</span>
              </div>
            </div>

            <div className="mt-3">
              {getStatusBadge(zavod.stav)}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Link href={`/zavod/${zavod.id}`}>
              <Button variant="outline" size="sm" className="w-full">
                Zobrazit
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            {zavod.stav === "priprava" && (
              <Link href={`/zavod/${zavod.id}`}>
                <Button size="sm" className="w-full">
                  Přihlásit se
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ZavodListProps {
  zavody: KalendarZavod[]
  title?: string
  emptyMessage?: string
  highlightedIds?: string[]
}

export function ZavodList({
  zavody,
  title,
  emptyMessage = "Žádné závody",
  highlightedIds = [],
}: ZavodListProps) {
  if (zavody.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {title && (
        <h2 className="font-semibold text-lg">{title}</h2>
      )}
      {zavody.map((zavod) => (
        <ZavodCard
          key={zavod.id}
          zavod={zavod}
          highlighted={highlightedIds.includes(zavod.id)}
        />
      ))}
    </div>
  )
}
