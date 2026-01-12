"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Trophy,
  Calendar,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Search,
  Filter,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAllZavody } from "@/actions/hlavni-admin.actions"
import type { Zavod } from "@/lib/types"

export default function ZavodyListPage() {
  const [zavody, setZavody] = useState<Zavod[]>([])
  const [filteredZavody, setFilteredZavody] = useState<Zavod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [stavFilter, setStavFilter] = useState<string>("all")

  useEffect(() => {
    const fetchZavody = async () => {
      const result = await getAllZavody()
      if (result.success && result.data) {
        setZavody(result.data)
        setFilteredZavody(result.data)
      } else {
        setError(result.error?.message || 'Nepodařilo se načíst závody')
      }
      setIsLoading(false)
    }

    fetchZavody()
  }, [])

  useEffect(() => {
    let filtered = zavody

    // Filtr podle stavu
    if (stavFilter !== "all") {
      filtered = filtered.filter(z => z.stav === stavFilter)
    }

    // Filtr podle vyhledávání
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(z =>
        z.nazev.toLowerCase().includes(query) ||
        z.misto?.toLowerCase().includes(query)
      )
    }

    setFilteredZavody(filtered)
  }, [zavody, stavFilter, searchQuery])

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Závody</h1>
          <p className="text-muted-foreground mt-1">
            Správa všech závodů ({zavody.length})
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat podle názvu nebo místa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={stavFilter} onValueChange={setStavFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            <SelectItem value="priprava">Příprava</SelectItem>
            <SelectItem value="probiha">Probíhá</SelectItem>
            <SelectItem value="ukoncen">Ukončen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Závody grid */}
      {filteredZavody.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredZavody.map((zavod) => (
            <Link key={zavod.id} href={`/admin/${zavod.id}`}>
              <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${
                zavod.stav === 'probiha' ? 'border-green-500/30' :
                zavod.stav === 'ukoncen' ? 'opacity-75 hover:opacity-100' : ''
              }`}>
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
      ) : (
        <Card className="p-12 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          {searchQuery || stavFilter !== "all" ? (
            <>
              <h3 className="text-lg font-semibold mb-2">Žádné výsledky</h3>
              <p className="text-muted-foreground mb-4">
                Zkuste změnit vyhledávací dotaz nebo filtry.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setStavFilter("all")
                }}
              >
                Zrušit filtry
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </Card>
      )}
    </div>
  )
}
