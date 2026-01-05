'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { Calendar, MapPin, Trophy, Filter, X, Download } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'
import type { Zavod, Soutez } from '@/lib/types'

interface ZavodWithSoutez extends Zavod {
  souteze?: Soutez | null
}

interface FilterState {
  rok: number | null
  soutezId: string | null
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  
  if (startDate.toDateString() === endDate.toDateString()) {
    return formatDate(start)
  }
  
  return `${formatDate(start)} - ${formatDate(end)}`
}

function ZavodArchiveCard({ zavod }: { zavod: ZavodWithSoutez }) {
  return (
    <GlassCard interactive className="hover:shadow-md transition-shadow">
      <GlassCardHeader className="pb-3">
        <div className="space-y-1">
          <GlassCardTitle className="text-lg">{zavod.nazev}</GlassCardTitle>
          {zavod.souteze && (
            <GlassCardDescription>
              Soutěž {zavod.souteze.nazev} {zavod.souteze.rok}
            </GlassCardDescription>
          )}
        </div>
      </GlassCardHeader>
      <GlassCardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDateRange(zavod.datum_start, zavod.datum_end)}</span>
        </div>
        
        {zavod.misto && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{zavod.misto}</span>
          </div>
        )}

        <div className="pt-2 flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/zavod/${zavod.id}`}>
              <Trophy className="h-4 w-4 mr-2" />
              Zobrazit výsledky
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={`/api/export/${zavod.id}`} download>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}

export default function ArchivPage() {
  const [zavody, setZavody] = useState<ZavodWithSoutez[]>([])
  const [souteze, setSouteze] = useState<Soutez[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({ rok: null, soutezId: null })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all archived competitions
      const { data: zavodData, error: zavodError } = await supabase
        .from('zavody')
        .select(`
          *,
          souteze (*)
        `)
        .eq('stav', 'ukoncen')
        .order('datum_end', { ascending: false })

      if (zavodError) throw zavodError

      // Fetch all souteze for filter
      const { data: soutezData, error: soutezError } = await supabase
        .from('souteze')
        .select('*')
        .order('rok', { ascending: false })

      if (soutezError) throw soutezError

      setZavody(zavodData as ZavodWithSoutez[] || [])
      setSouteze(soutezData as Soutez[] || [])
    } catch (err) {
      console.error('Error fetching archive:', err)
      setError('Nepodařilo se načíst archiv závodů')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Get unique years from zavody
  const years = [...new Set(zavody.map(z => new Date(z.datum_end).getFullYear()))].sort((a, b) => b - a)

  // Filter zavody based on selected filters
  const filteredZavody = zavody.filter(z => {
    if (filters.rok && new Date(z.datum_end).getFullYear() !== filters.rok) {
      return false
    }
    if (filters.soutezId && z.soutez_id !== filters.soutezId) {
      return false
    }
    return true
  })

  const hasActiveFilters = filters.rok !== null || filters.soutezId !== null

  const clearFilters = () => {
    setFilters({ rok: null, soutezId: null })
  }

  if (loading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="space-y-2">
          <SkeletonLoader variant="text" width="200px" />
          <SkeletonLoader variant="text" width="400px" />
        </div>
        <SkeletonLoader variant="card" height={80} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" height={180} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-6">
        <ErrorState 
          title="Chyba při načítání" 
          message={error}
          onRetry={fetchData}
        />
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Archiv závodů</h1>
        <p className="text-muted-foreground">
          Prohlédněte si výsledky a statistiky minulých závodů Carp Club ČR.
        </p>
      </div>

      {/* Filters */}
      <GlassCard noPadding className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtrovat:</span>
          </div>

          {/* Year filter */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center">Rok:</span>
            {years.map(year => (
              <Button
                key={year}
                variant={filters.rok === year ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters(f => ({ ...f, rok: f.rok === year ? null : year }))}
              >
                {year}
              </Button>
            ))}
          </div>

          {/* Soutez filter */}
          {souteze.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground self-center">Soutěž:</span>
              {souteze.map(s => (
                <Button
                  key={s.id}
                  variant={filters.soutezId === s.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters(f => ({ ...f, soutezId: f.soutezId === s.id ? null : s.id }))}
                >
                  {s.nazev} {s.rok}
                </Button>
              ))}
            </div>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Zrušit filtry
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredZavody.length === 0 
          ? 'Žádné závody nenalezeny'
          : `Nalezeno ${filteredZavody.length} ${filteredZavody.length === 1 ? 'závod' : filteredZavody.length < 5 ? 'závody' : 'závodů'}`
        }
      </div>

      {/* Zavody grid */}
      {filteredZavody.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <p className="text-muted-foreground">
            {hasActiveFilters 
              ? 'Pro zvolené filtry nebyly nalezeny žádné závody.'
              : 'V archivu zatím nejsou žádné závody.'
            }
          </p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Zrušit filtry
            </Button>
          )}
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredZavody.map((zavod) => (
            <ZavodArchiveCard key={zavod.id} zavod={zavod} />
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="pt-4">
        <Button asChild variant="ghost">
          <Link href="/">← Zpět na hlavní stránku</Link>
        </Button>
      </div>
    </div>
  )
}
