"use client"

import { useState, useEffect } from "react"
import { RefreshCw, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LeaderboardTable } from "@/components/zavod/LeaderboardTable"
import { NejvetsiRybaCard } from "@/components/zavod/NejvetsiRybaCard"
import { ErrorState } from "@/components/common/ErrorState"
import { getLeaderboard, getNejvetsiRyby } from "@/actions/leaderboard.actions"
import type { LeaderboardEntry, UlovekWithRelations } from "@/lib/types"

interface LeaderboardPageProps {
  params: Promise<{ zavodId: string }>
}

export default function LeaderboardPage({ params }: LeaderboardPageProps) {
  const [zavodId, setZavodId] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [nejvetsiRyby, setNejvetsiRyby] = useState<UlovekWithRelations[]>([])
  const [embargoActive, setEmbargoActive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setZavodId(p.zavodId))
  }, [params])

  const fetchData = async (showRefreshing = false) => {
    if (!zavodId) return
    if (showRefreshing) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)

    try {
      const [leaderboardResult, rybyResult] = await Promise.all([
        getLeaderboard(zavodId),
        getNejvetsiRyby(zavodId, 10),
      ])

      if (leaderboardResult.success && leaderboardResult.data) {
        setLeaderboard(leaderboardResult.data.leaderboard)
        setEmbargoActive(leaderboardResult.data.embargoActive)
      } else {
        setError(leaderboardResult.error?.message || "Nepodařilo se načíst pořadí")
      }

      if (rybyResult.success && rybyResult.data) {
        setNejvetsiRyby(rybyResult.data.ryby)
      }
    } catch (err) {
      setError("Nepodařilo se načíst data")
      console.error("Error fetching leaderboard data:", err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [zavodId])

  const handleRefresh = () => fetchData(true)

  if (!zavodId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Načítání...</div>
      </div>
    )
  }

  if (error) {
    return <ErrorState title="Chyba při načítání" message={error} onRetry={() => fetchData()} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pořadí</h1>
          <p className="text-muted-foreground">Aktuální pořadí týmů v závodě</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Obnovit
        </Button>
      </div>

      {embargoActive && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Embargo je aktivní</p>
            <p className="text-sm opacity-90">Váhy úlovků jsou skryté. Plné výsledky budou zobrazeny po skončení závodu.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeaderboardTable entries={leaderboard} embargoActive={embargoActive} showWeights={!embargoActive} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-1">
          <NejvetsiRybaCard ryby={nejvetsiRyby} embargoActive={embargoActive} showWeights={!embargoActive} isLoading={isLoading} limit={10} />
        </div>
      </div>
    </div>
  )
}
