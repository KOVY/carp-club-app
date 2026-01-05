"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { 
  Trophy, 
  Camera, 
  FileText, 
  RefreshCw, 
  Fish,
  Calendar,
  MapPin,
  Clock,
  Users,
  Eye
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"
import { DataDisplay } from "@/components/ui/DataDisplay"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SkeletonLoader } from "@/components/ui/SkeletonLoader"
import { CompactLeaderboard, CompactBiggestFish } from "@/components/zavod"
import { ErrorState } from "@/components/common/ErrorState"
import { StatusMessage } from "@/components/common/StatusMessage"
import { createClient } from "@/lib/supabase/client"
import { getLeaderboard, getNejvetsiRyby } from "@/actions/leaderboard.actions"
import type { Zavod, LeaderboardEntry, UlovekWithRelations } from "@/lib/types"

/**
 * Public View Page - Accessible without login
 * 
 * Requirements:
 * - 8.2: WHEN uživatel s rolí divak přistupuje k systému, THE System SHALL zobrazit 
 *        pouze veřejné informace (leaderboard, fotogalerie, pravidla)
 * 
 * This page provides a public overview of the competition that anyone can view
 * without needing to log in. It shows:
 * - Competition info (name, dates, location)
 * - Current leaderboard (respecting embargo)
 * - Biggest fish
 * - Links to gallery and rules
 */
export default function VerejnostPage() {
  const params = useParams()
  const zavodId = params.zavodId as string

  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [biggestFish, setBiggestFish] = useState<UlovekWithRelations | null>(null)
  const [embargoActive, setEmbargoActive] = useState(false)
  const [teamsCount, setTeamsCount] = useState(0)
  const [catchesCount, setCatchesCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const supabase = createClient()

      // Fetch zavod data
      const { data: zavodData, error: zavodError } = await supabase
        .from('zavody')
        .select('*')
        .eq('id', zavodId)
        .single()

      if (zavodError || !zavodData) {
        setError("Závod nebyl nalezen")
        return
      }

      setZavod(zavodData as Zavod)

      // Fetch teams count
      const { count: teams } = await supabase
        .from('tymy')
        .select('*', { count: 'exact', head: true })
        .eq('zavod_id', zavodId)

      setTeamsCount(teams || 0)

      // Fetch confirmed catches count
      const { count: catches } = await supabase
        .from('ulovky')
        .select('*', { count: 'exact', head: true })
        .eq('zavod_id', zavodId)
        .eq('stav', 'potvrzeno')

      setCatchesCount(catches || 0)

      // Fetch leaderboard
      const leaderboardResult = await getLeaderboard(zavodId)
      if (leaderboardResult.success && leaderboardResult.data) {
        setLeaderboard(leaderboardResult.data.leaderboard)
        setEmbargoActive(leaderboardResult.data.embargoActive)
      }

      // Fetch biggest fish
      const biggestFishResult = await getNejvetsiRyby(zavodId, 1)
      if (biggestFishResult.success && biggestFishResult.data) {
        setBiggestFish(biggestFishResult.data.ryby[0] || null)
      }
    } catch (err) {
      setError("Nepodařilo se načíst data")
      console.error("Error fetching public data:", err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [zavodId])

  const handleRefresh = () => {
    fetchData(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStavText = (stav: string) => {
    switch (stav) {
      case 'priprava':
        return 'Příprava'
      case 'probiha':
        return 'Probíhá'
      case 'ukoncen':
        return 'Ukončen'
      default:
        return stav
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="text" count={2} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" height={100} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonLoader variant="card" height={300} />
          <SkeletonLoader variant="card" height={300} />
        </div>
      </div>
    )
  }

  if (error || !zavod) {
    return (
      <ErrorState
        title="Chyba při načítání"
        message={error || "Závod nebyl nalezen"}
        onRetry={() => fetchData()}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Veřejný přehled</span>
          </div>
          <h1 className="text-3xl font-bold">{zavod.nazev}</h1>
          {zavod.misto && (
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4" />
              {zavod.misto}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Obnovit
        </Button>
      </div>

      {/* Embargo warning */}
      {embargoActive && (
        <StatusMessage 
          variant="embargo" 
          title="Embargo je aktivní"
          description="Váhy úlovků jsou skryté. Plné výsledky budou zobrazeny po skončení závodu."
        />
      )}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Stav závodu</GlassCardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </GlassCardHeader>
          <GlassCardContent>
            <StatusBadge 
              status={zavod.stav === 'probiha' ? 'confirmed' : zavod.stav === 'priprava' ? 'pending' : 'embargo'} 
              size="md"
            >
              {getStavText(zavod.stav)}
            </StatusBadge>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Datum</GlassCardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-sm font-medium">{formatDate(zavod.datum_start)}</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(zavod.datum_start)} - {formatTime(zavod.datum_end)}
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Týmy</GlassCardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </GlassCardHeader>
          <GlassCardContent>
            <DataDisplay value={teamsCount} size="lg" />
            <p className="text-xs text-muted-foreground mt-1">
              registrovaných týmů
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Úlovky</GlassCardTitle>
            <Fish className="h-4 w-4 text-muted-foreground" />
          </GlassCardHeader>
          <GlassCardContent>
            <DataDisplay value={catchesCount} size="lg" />
            <p className="text-xs text-muted-foreground mt-1">
              potvrzených úlovků
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leaderboard */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Aktuální pořadí
            </GlassCardTitle>
            <GlassCardDescription>
              Top 10 týmů v závodě
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <CompactLeaderboard 
              entries={leaderboard} 
              embargoActive={embargoActive}
              limit={10}
            />
            <div className="mt-4 pt-4 border-t">
              <Link href={`/zavod/${zavodId}/leaderboard`}>
                <Button variant="outline" className="w-full gap-2">
                  <Trophy className="h-4 w-4" />
                  Zobrazit kompletní pořadí
                </Button>
              </Link>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Biggest fish */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Fish className="h-5 w-5" />
              Největší ryba
            </GlassCardTitle>
            <GlassCardDescription>
              Aktuálně největší úlovek
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <CompactBiggestFish 
              fish={biggestFish} 
              embargoActive={embargoActive}
            />
            <div className="mt-4 pt-4 border-t">
              <Link href={`/zavod/${zavodId}/galerie`}>
                <Button variant="outline" className="w-full gap-2">
                  <Camera className="h-4 w-4" />
                  Zobrazit fotogalerii
                </Button>
              </Link>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Quick links */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>Další informace</GlassCardTitle>
          <GlassCardDescription>
            Prohlédněte si pravidla závodu a fotogalerii úlovků
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href={`/zavod/${zavodId}/pravidla`}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <FileText className="h-6 w-6" />
                <span>Pravidla závodu</span>
              </Button>
            </Link>
            <Link href={`/zavod/${zavodId}/galerie`}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Camera className="h-6 w-6" />
                <span>Fotogalerie</span>
              </Button>
            </Link>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
