"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Trophy, Share2, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher"
import { LigaTable } from "@/components/sezona/LigaTable"
import { SwipeableContainer } from "@/components/common/SwipeableContainer"
import { ErrorState } from "@/components/common/ErrorState"
import { getSezonaLeaderboard, type SezonaData } from "@/actions/sezona.actions"
import { AKTUALNI_SEZONA } from "@/lib/sezona-config"
import { cn } from "@/lib/utils"

type AktivniLiga = "A" | "B"

export default function SezonaPage() {
  const [data, setData] = useState<SezonaData | null>(null)
  const [aktivniLiga, setAktivniLiga] = useState<AktivniLiga>("A")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)

    try {
      const result = await getSezonaLeaderboard()
      if (result.success && result.data) {
        setData(result.data)
      } else {
        setError(result.error?.message || "Nepodařilo se načíst data")
      }
    } catch (err) {
      setError("Nepodařilo se načíst data sezóny")
      console.error("Error fetching sezona data:", err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Swipe handlers pro mobil
  const handleSwipeLeft = () => setAktivniLiga("B")
  const handleSwipeRight = () => setAktivniLiga("A")

  const handleShare = async () => {
    const url = window.location.href
    const title = `${AKTUALNI_SEZONA.nazev} - Průběžné pořadí`

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch (err) {
        // Uživatel zrušil sdílení
      }
    } else {
      // Fallback - zkopírovat do schránky
      await navigator.clipboard.writeText(url)
      alert("Odkaz zkopírován do schránky!")
    }
  }

  const toggleLiga = () => {
    setAktivniLiga((prev) => (prev === "A" ? "B" : "A"))
  }

  if (error) {
    return <ErrorState title="Chyba při načítání" message={error} onRetry={() => fetchData()} />
  }

  const currentLiga = aktivniLiga === "A" ? data?.ligaA : data?.ligaB

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-foreground">
                <Trophy className="h-6 w-6 text-primary" />
                {AKTUALNI_SEZONA.nazev}
              </h1>
              <p className="text-sm text-muted-foreground">Průběžné pořadí</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                title="Sdílet"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">Obnovit</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Liga Tabs */}
      <div className="sticky top-[73px] z-30 bg-background border-b">
        <div className="container">
          <div className="flex items-center justify-between py-2">
            {/* Desktop: Šipky vlevo */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAktivniLiga("A")}
              disabled={aktivniLiga === "A"}
              className="hidden md:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Taby */}
            <div className="flex-1 flex justify-center">
              <div className="inline-flex rounded-lg border bg-muted p-1">
                <button
                  onClick={() => setAktivniLiga("A")}
                  className={cn(
                    "px-6 py-2 rounded-md text-sm transition-all",
                    aktivniLiga === "A"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  )}
                  style={
                    aktivniLiga === "A"
                      ? { borderBottom: `2px solid ${data?.sezona.ligaA.barva}` }
                      : undefined
                  }
                >
                  <span className="mr-1.5">{data?.sezona.ligaA.icon || "🏆"}</span>
                  Liga A
                </button>
                <button
                  onClick={() => setAktivniLiga("B")}
                  className={cn(
                    "px-6 py-2 rounded-md text-sm transition-all",
                    aktivniLiga === "B"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  )}
                  style={
                    aktivniLiga === "B"
                      ? { borderBottom: `2px solid ${data?.sezona.ligaB.barva}` }
                      : undefined
                  }
                >
                  <span className="mr-1.5">{data?.sezona.ligaB.icon || "🎯"}</span>
                  Liga B
                </button>
              </div>
            </div>

            {/* Desktop: Šipky vpravo */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAktivniLiga("B")}
              disabled={aktivniLiga === "B"}
              className="hidden md:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile swipe indicator */}
          <div className="md:hidden flex justify-center pb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  aktivniLiga === "A" ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
              <span>swipe pro přepnutí</span>
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  aktivniLiga === "B" ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Swipe */}
      <SwipeableContainer
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        threshold={75}
        showIndicator
        className="flex-1"
      >
      <main className="container py-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : currentLiga ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 rounded-xl bg-card border border-border shadow-sm">
                <p className="text-3xl font-extrabold text-foreground">{currentLiga.celkemTymu}</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Týmů</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-card border border-border shadow-sm">
                <p className="text-3xl font-extrabold text-foreground">
                  {currentLiga.leaderboard.reduce((sum, e) => sum + e.pocetRyb, 0)}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Úlovků</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-card border border-border shadow-sm">
                <p className="text-3xl font-extrabold text-accent">
                  {currentLiga.leaderboard
                    .reduce((sum, e) => sum + e.skore, 0)
                    .toFixed(1)}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">kg celkem</p>
              </div>
            </div>

            {/* Embargo warning */}
            {currentLiga.embargoActive && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 text-sm">
                Embargo aktivní - váhy jsou skryté
              </div>
            )}

            {/* Leaderboard Table */}
            <LigaTable
              entries={currentLiga.leaderboard}
              liga={currentLiga.liga}
              barva={currentLiga.barva}
              embargoActive={currentLiga.embargoActive}
              showWeights={!currentLiga.embargoActive}
              pocetSestupujicich={data?.sezona.pocetSestupujicich}
              pocetPostupujicich={data?.sezona.pocetPostupujicich}
            />
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Žádná data k zobrazení
          </div>
        )}
      </main>
      </SwipeableContainer>

      {/* Footer info */}
      <footer className="border-t py-4">
        <div className="container text-center text-sm text-muted-foreground">
          <p>
            Liga A: Poslední {data?.sezona.pocetSestupujicich || 3} týmy sestupují do B
          </p>
          <p>
            Liga B: První {data?.sezona.pocetPostupujicich || 1} tým postupuje do A
          </p>
        </div>
      </footer>
    </div>
  )
}
