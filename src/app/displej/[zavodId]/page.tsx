"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Trophy, Fish, MapPin, Maximize, Minimize, Award } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher"
import { LeaderboardTable } from "@/components/zavod"
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard"
import { createClient } from "@/lib/supabase/client"
import { getLeaderboard, getNejvetsiRyby } from "@/actions/leaderboard.actions"
import { cn } from "@/lib/utils"
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

  // Je méně než hodina do konce? → napětí
  const isEndingSoon = (() => {
    if (!zavod?.datum_end || odpocet === "Závod ukončen") return false
    const endMs = new Date(zavod.datum_end).getTime()
    return endMs - now < 3_600_000
  })()

  const zavodUkoncen = odpocet === "Závod ukončen" || zavod?.stav === "ukoncen"

  const getStavText = (stav?: string) =>
    stav === "probiha" ? "Probíhá" : stav === "priprava" ? "Příprava" : stav === "ukoncen" ? "Ukončen" : (stav ?? "")

  const getStatusBadgeStatus = (stav?: string) => {
    if (stav === "probiha") return "confirmed" as const
    if (stav === "priprava") return "pending" as const
    // ukoncen → embargo (neutrální šedá) — odpovídá "embargo" variant v StatusBadge
    return "embargo" as const
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto" />
          <p className="text-2xl text-muted-foreground font-medium">Načítání…</p>
        </div>
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ─── HLAVIČKA ─────────────────────────────────────────── */}
      <header className="glass-bar border-b border-border/60 px-6 lg:px-10 py-5 flex items-center justify-between gap-6 flex-shrink-0">

        {/* Levá část: název + místo */}
        <div className="min-w-0 flex-1">
          <h1 className="font-extrabold leading-none tracking-tight text-foreground truncate text-4xl lg:text-5xl xl:text-6xl">
            {zavod.nazev}
          </h1>
          {zavod.misto && (
            <p className="text-muted-foreground flex items-center gap-2 mt-2 text-base lg:text-lg">
              <MapPin className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{zavod.misto}</span>
            </p>
          )}
        </div>

        {/* Pravá část: status + odpočet + controls */}
        <div className="flex items-center gap-4 flex-shrink-0">

          {/* StatusBadge – stav závodu */}
          <StatusBadge
            status={getStatusBadgeStatus(zavod.stav)}
            size="lg"
          >
            {getStavText(zavod.stav)}
          </StatusBadge>

          {/* Odpočet — zobrazuj jen pokud závod probíhá/připraven a není ukončen */}
          {odpocet && !zavodUkoncen && (
            <div className={cn(
              "text-right rounded-xl px-4 py-2 border",
              isEndingSoon
                ? "bg-accent/10 border-accent/40"
                : "bg-primary/5 border-primary/20"
            )}>
              <p className="text-xs uppercase tracking-widest text-muted-foreground leading-none mb-1">
                Do konce
              </p>
              <p className={cn(
                "font-mono font-extrabold tabular-nums leading-none",
                isEndingSoon
                  ? "text-accent text-3xl lg:text-4xl"
                  : "text-foreground text-2xl lg:text-3xl"
              )}>
                {odpocet}
              </p>
              {isEndingSoon && (
                <p className="text-[10px] text-accent/80 uppercase tracking-widest mt-1">
                  Finišuj!
                </p>
              )}
            </div>
          )}

          <ThemeSwitcher />
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            aria-label="Celá obrazovka"
            className="h-10 w-10"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* ─── EMBARGO BANNER ───────────────────────────────────── */}
      {embargoActive && (
        <div className="flex-shrink-0 px-6 lg:px-10 py-3 bg-amber-500/10 border-b border-amber-500/30">
          <p className="text-amber-700 dark:text-amber-400 text-base font-semibold text-center tracking-wide">
            🔒 Embargo aktivní — váhy jsou skryté
          </p>
        </div>
      )}

      {/* ─── HLAVNÍ OBSAH ─────────────────────────────────────── */}
      <main className="flex-1 grid gap-6 lg:gap-8 lg:grid-cols-3 p-6 lg:p-10">

        {/* ── POŘADÍ (2/3 šířky) ─────────────────────────────── */}
        <section className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-7 w-7 text-accent flex-shrink-0" />
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
              Pořadí
            </h2>
          </div>

          {/* Wrapper se zvětšením pro displej */}
          <div className="displej-leaderboard">
            <LeaderboardTable
              entries={leaderboard}
              embargoActive={embargoActive}
              showWeights={!embargoActive}
            />
          </div>
        </section>

        {/* ── SIDEBAR (1/3 šířky) ────────────────────────────── */}
        <aside className="flex flex-col gap-6">

          {/* Největší ryba — hero panel */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Fish className="h-7 w-7 text-accent flex-shrink-0" />
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
                Největší ryba
              </h2>
            </div>

            <BigFishHero fish={biggestFish} embargoActive={embargoActive} />
          </div>

          {/* Placeholder pro DisplejPrivolani (Task 3) */}
          {/* <DisplejPrivolani zavodId={zavodId} /> */}
        </aside>
      </main>

      {/* Globální displej CSS – zvětšení fontu tabulky pořadí */}
      <style jsx global>{`
        /* Displej: zvětšení LeaderboardTable pro čitelnost z dálky */
        .displej-leaderboard table {
          font-size: 1.125rem; /* 18px base */
        }
        .displej-leaderboard th {
          font-size: 0.875rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding-top: 0.75rem;
          padding-bottom: 0.75rem;
        }
        .displej-leaderboard td {
          padding-top: 0.9rem;
          padding-bottom: 0.9rem;
        }
        /* Váha (AnimatedScore) v tabulce — zvětši na displeji */
        .displej-leaderboard .tabular-nums {
          font-size: 1.35rem !important;
        }
        /* Vedoucí řádek — jemnější akcent okraj a pulsace */
        .displej-leaderboard tr.border-l-4 {
          border-left-width: 5px;
        }
        /* Medal ikony zvětšit */
        .displej-leaderboard svg.h-7 {
          width: 2rem;
          height: 2rem;
        }
        /* Karty (md:hidden) – zvětšit na displeji pro menší šířky */
        .displej-leaderboard .space-y-3 > div {
          padding: 1rem 1.25rem;
        }
      `}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   BigFishHero — velký panel s největší rybou
   ───────────────────────────────────────────────────────────── */
interface BigFishHeroProps {
  fish: UlovekWithRelations | null
  embargoActive?: boolean
}

function BigFishHero({ fish, embargoActive = false }: BigFishHeroProps) {
  const weightsVisible = !embargoActive

  if (!fish) {
    return (
      <GlassCard className="halo-card">
        <GlassCardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <Fish className="h-16 w-16 text-muted-foreground/40" />
          <p className="text-xl text-muted-foreground">Zatím žádné úlovky</p>
          <p className="text-sm text-muted-foreground/70">
            Největší ryba se zobrazí po potvrzení prvního úlovku
          </p>
        </GlassCardContent>
      </GlassCard>
    )
  }

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    })

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "numeric",
    })

  return (
    <GlassCard
      className={cn(
        "halo-card border-yellow-500/30 overflow-hidden",
        "animate-[leader-pulse_3s_ease-in-out_infinite]"
      )}
    >
      <GlassCardContent className="p-0">
        {/* Zlatý gradient banner nahoře */}
        <div className="bg-gradient-to-r from-yellow-500/20 via-amber-400/15 to-yellow-500/10 px-5 py-3 flex items-center gap-2 border-b border-yellow-500/20">
          <span className="inline-flex rounded-full medal-glow-1">
            <Award className="h-5 w-5 text-yellow-500" />
          </span>
          <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-widest">
            Největší ryba závodu
          </span>
        </div>

        <div className="p-5 space-y-5">
          {/* Druh ryby + váha jako hero */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl lg:text-3xl font-extrabold text-foreground leading-tight">
                {fish.druh === "kapr" ? "🐟 Kapr" : "🐠 Amur"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {fish.tym?.nazev}
              </p>
            </div>

            {/* Váha — největší, accentní, bez glow na číslech */}
            <div className="text-right flex-shrink-0">
              {weightsVisible ? (
                <>
                  <p className="font-mono font-extrabold text-accent tabular-nums leading-none
                                text-4xl lg:text-5xl xl:text-6xl">
                    {fish.vaha}
                  </p>
                  <p className="text-lg font-bold text-accent/70 mt-0.5">kg</p>
                </>
              ) : (
                <p className="text-3xl font-mono text-muted-foreground">---</p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
            <div className="space-y-0.5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Peg</p>
              <p className="text-lg font-bold text-foreground">
                {fish.tym?.peg_cislo ?? "–"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Čas úlovku</p>
              <p className="text-lg font-bold text-foreground">
                {formatDate(fish.cas)} {formatTime(fish.cas)}
              </p>
            </div>
            {fish.chytil && (
              <div className="col-span-2 space-y-0.5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Chytil</p>
                <p className="text-lg font-bold text-foreground">{fish.chytil.jmeno}</p>
              </div>
            )}
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
