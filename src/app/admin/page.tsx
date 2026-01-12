"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Trophy,
  Users,
  Calendar,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllZavody } from "@/actions/hlavni-admin.actions"
import type { Zavod } from "@/lib/types"

export default function AdminDashboardPage() {
  const [zavody, setZavody] = useState<Zavod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchZavody = async () => {
      const result = await getAllZavody()
      if (result.success && result.data) {
        setZavody(result.data)
      } else {
        setError(result.error?.message || 'Nepodařilo se načíst závody')
      }
      setIsLoading(false)
    }

    fetchZavody()
  }, [])

  const getStavBadge = (stav: string) => {
    switch (stav) {
      case 'priprava':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600">
            <Clock className="h-3 w-3" />
            Příprava
          </span>
        )
      case 'probiha':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
            <CheckCircle className="h-3 w-3" />
            Probíhá
          </span>
        )
      case 'ukoncen':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-600">
            <AlertCircle className="h-3 w-3" />
            Ukončen
          </span>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)

    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(start)
    }

    return `${formatDate(start)} - ${formatDate(end)}`
  }

  // Rozdělit závody podle stavu
  const activeZavody = zavody.filter(z => z.stav === 'probiha')
  const upcomingZavody = zavody.filter(z => z.stav === 'priprava')
  const pastZavody = zavody.filter(z => z.stav === 'ukoncen')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Správa závodů a týmů
          </p>
        </div>
        <Link href="/admin/zavody/novy">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nový závod
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Aktivní závody */}
      {activeZavody.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Probíhající závody
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeZavody.map((zavod) => (
              <Link key={zavod.id} href={`/admin/${zavod.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-green-500/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{zavod.nazev}</CardTitle>
                      {getStavBadge(zavod.stav)}
                    </div>
                    {zavod.misto && (
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {zavod.misto}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDateRange(zavod.datum_start, zavod.datum_end)}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Nadcházející závody */}
      {upcomingZavody.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Nadcházející závody
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingZavody.map((zavod) => (
              <Link key={zavod.id} href={`/admin/${zavod.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{zavod.nazev}</CardTitle>
                      {getStavBadge(zavod.stav)}
                    </div>
                    {zavod.misto && (
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {zavod.misto}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDateRange(zavod.datum_start, zavod.datum_end)}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Minulé závody */}
      {pastZavody.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-gray-500" />
            Ukončené závody
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pastZavody.slice(0, 6).map((zavod) => (
              <Link key={zavod.id} href={`/admin/${zavod.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75 hover:opacity-100">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{zavod.nazev}</CardTitle>
                      {getStavBadge(zavod.stav)}
                    </div>
                    {zavod.misto && (
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {zavod.misto}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDateRange(zavod.datum_start, zavod.datum_end)}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {pastZavody.length > 6 && (
            <div className="mt-4 text-center">
              <Link href="/admin/zavody">
                <Button variant="outline">
                  Zobrazit všechny závody ({pastZavody.length})
                </Button>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Prázdný stav */}
      {zavody.length === 0 && !error && (
        <Card className="p-12 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Žádné závody</h3>
          <p className="text-muted-foreground mb-4">
            Zatím nemáte vytvořené žádné závody.
          </p>
          <Link href="/admin/zavody/novy">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Vytvořit první závod
            </Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
