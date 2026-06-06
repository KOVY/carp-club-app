"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Trophy, Fish, MapPin, Maximize, Minimize } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher"
import { CompactLeaderboard, CompactBiggestFish } from "@/components/zavod"
import { createClient } from "@/lib/supabase/client"
import { getLeaderboard, getNejvetsiRyby } from "@/actions/leaderboard.actions"
import type { Zavod, LeaderboardEntry, UlovekWithRelations } from "@/lib/types"

const REFRESH_MS = 15000

export default function DisplejPage() {
  const params = useParams()
  const zavodId = params.zavodId as string

  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [biggestFish, setBiggestFish] = useState<UlovekWithRelations | null>(null)
  const [embargoActive, setEmbargoActive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())
  const [isFullscreen, setIsFullscreen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: zavodData, error: zavodError } = await supabase
        .from("zavody").select("*").eq("id", zavodId).single()
      if (zavodError || !zavodData) {
        setError("Závod nebyl nalezen")
        return
      }
      setZavod(zavodData as Zavod)

      const lb = await getLeaderboard(zavodId)
      if (lb.success && lb.data) {
        setLeaderboard(lb.data.leaderboard)
        setEmbargoActive(lb.data.embargoActive)
      }
      const bf = await getNejvetsiRyby(zavodId, 1)
      if (bf.success && bf.data) setBiggestFish(bf.data.ryby[0] || null)
      setError(null)
    } catch (err) {
      console.error("Displej fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [zavodId])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchData])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  const odpocet = (() => {
    if (!zavod?.datum_end) return null
    const endMs = new Date(zavod.datum_end).getTime()
    const diff = endMs - now
    if (diff <= 0) return "Závod ukončen"
    const h = Math.floor(diff / 3_600_000)
    const m = Math.floor((diff % 3_600_000) / 60_000)
    const s = Math.floor((diff % 60_000) / 1000)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  })()

  const getStavText = (stav?: string) =>
    stav === "probiha" ? "Probíhá" : stav === "priprava" ? "Příprava" : stav === "ukoncen" ? "Ukončen" : (stav ?? "")

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-2xl text-muted-foreground">
        Načítání…
      </div>
    )
  }
  if (error || !zavod) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-2xl text-destructive">
        {error || "Závod nebyl nalezen"}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 lg:p-10">
      <header className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl lg:text-5xl font-extrabold">{zavod.nazev}</h1>
          {zavod.misto && (
            <p className="text-muted-foreground flex items-center gap-2 mt-2 text-lg">
              <MapPin className="h-5 w-5" /> {zavod.misto}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            status={zavod.stav === "probiha" ? "confirmed" : zavod.stav === "priprava" ? "pending" : "embargo"}
            size="md"
          >
            {getStavText(zavod.stav)}
          </StatusBadge>
          {odpocet && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Do konce</p>
              <p className="text-2xl font-mono font-bold tabular-nums">{odpocet}</p>
            </div>
          )}
          <ThemeSwitcher />
          <Button variant="outline" size="icon" onClick={toggleFullscreen} aria-label="Celá obrazovka">
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {embargoActive && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-lg">
          Embargo aktivní — váhy jsou skryté
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <Trophy className="h-6 w-6 text-accent" /> Pořadí
          </h2>
          <CompactLeaderboard entries={leaderboard} embargoActive={embargoActive} limit={10} />
        </section>
        <aside className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
              <Fish className="h-6 w-6 text-accent" /> Největší ryba
            </h2>
            <CompactBiggestFish fish={biggestFish} embargoActive={embargoActive} />
          </div>
          {/* Sem přijde DisplejPrivolani v Task 3 */}
        </aside>
      </div>
    </div>
  )
}
