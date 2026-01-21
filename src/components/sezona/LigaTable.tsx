"use client"

import { Trophy, Fish, AlertTriangle, ArrowUp, ArrowDown, Medal } from "lucide-react"
import { cn } from "@/lib/utils"
import { isVSestupoveZone, isVPostupoveZone } from "@/lib/sezona-config"
import type { LeaderboardEntry } from "@/lib/types"

interface LigaTableProps {
  entries: LeaderboardEntry[]
  liga: "A" | "B"
  barva: string
  embargoActive?: boolean
  showWeights?: boolean
  /** Počet týmů v sestupové zóně (pro Ligu A) */
  pocetSestupujicich?: number
  /** Počet týmů v postupové zóně (pro Ligu B) */
  pocetPostupujicich?: number
}

export function LigaTable({
  entries,
  liga,
  barva,
  embargoActive = false,
  showWeights = true,
  pocetSestupujicich = 3,
  pocetPostupujicich = 1,
}: LigaTableProps) {
  const weightsVisible = showWeights && !embargoActive
  const celkemTymu = entries.length

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Fish className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Zatím žádné výsledky</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {entries.map((entry, index) => {
        const pozice = index + 1
        const isDisqualified = entry.zluteKarty >= 2

        // Určení zóny
        const vSestupoveZone =
          liga === "A" && isVSestupoveZone(pozice, celkemTymu, pocetSestupujicich)
        const vPostupoveZone =
          liga === "B" && isVPostupoveZone(pozice, pocetPostupujicich)

        // Zobrazit oddělovač před sestupovou zónou
        const showSestupDivider =
          liga === "A" && pozice === celkemTymu - pocetSestupujicich + 1

        // Zobrazit oddělovač po postupové zóně
        const showPostupDivider =
          liga === "B" && pozice === pocetPostupujicich + 1

        return (
          <div key={entry.tym.id}>
            {/* Oddělovač sestupové zóny */}
            {showSestupDivider && (
              <div className="flex items-center gap-2 py-2 my-2">
                <div className="flex-1 h-px bg-red-500/30" />
                <span className="text-xs font-medium text-red-500 flex items-center gap-1">
                  <ArrowDown className="h-3 w-3" />
                  Sestupová zóna
                </span>
                <div className="flex-1 h-px bg-red-500/30" />
              </div>
            )}

            {/* Oddělovač postupové zóny */}
            {showPostupDivider && (
              <div className="flex items-center gap-2 py-2 my-2">
                <div className="flex-1 h-px bg-green-500/30" />
                <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  Postupová zóna výše
                </span>
                <div className="flex-1 h-px bg-green-500/30" />
              </div>
            )}

            {/* Řádek týmu */}
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                // Základní styly
                "bg-card/50 hover:bg-card",
                // Medailové pozice
                pozice === 1 && "bg-yellow-500/10 border border-yellow-500/20",
                pozice === 2 && "bg-gray-500/10 border border-gray-500/20",
                pozice === 3 && "bg-amber-500/10 border border-amber-500/20",
                // Sestupová zóna (Liga A)
                vSestupoveZone && "bg-red-500/5 border border-red-500/20",
                // Postupová zóna (Liga B)
                vPostupoveZone && "bg-green-500/5 border border-green-500/20",
                // Diskvalifikace
                isDisqualified && "opacity-50 bg-destructive/5"
              )}
            >
              {/* Pozice */}
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg flex-shrink-0",
                  pozice === 1 && "bg-yellow-500/20 text-yellow-600",
                  pozice === 2 && "bg-gray-500/20 text-gray-500",
                  pozice === 3 && "bg-amber-500/20 text-amber-600",
                  pozice > 3 && "bg-muted text-muted-foreground"
                )}
              >
                {pozice <= 3 ? <Medal className="h-5 w-5" /> : pozice}
              </div>

              {/* Info o týmu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "font-medium truncate",
                      isDisqualified && "line-through"
                    )}
                  >
                    {entry.tym.nazev}
                  </p>
                  {isDisqualified && (
                    <span className="text-xs text-destructive font-medium">(DQ)</span>
                  )}
                  {/* Indikátor postupu/sestupu */}
                  {vPostupoveZone && (
                    <span className="flex items-center gap-0.5 text-xs font-medium text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded">
                      <ArrowUp className="h-3 w-3" />A
                    </span>
                  )}
                  {vSestupoveZone && (
                    <span className="flex items-center gap-0.5 text-xs font-medium text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                      <ArrowDown className="h-3 w-3" />B
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>Peg {entry.tym.peg_cislo ?? "-"}</span>
                  <span className="flex items-center gap-1">
                    <Fish className="h-3 w-3" />
                    {entry.pocetRyb}
                  </span>
                  {entry.zluteKarty > 0 && (
                    <span
                      className={cn(
                        "flex items-center gap-1",
                        entry.zluteKarty >= 2 ? "text-destructive" : "text-amber-500"
                      )}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {entry.zluteKarty} ŽK
                    </span>
                  )}
                </div>
              </div>

              {/* Skóre */}
              {weightsVisible && (
                <div className="text-right flex-shrink-0">
                  <span
                    className={cn(
                      "font-mono text-lg font-semibold",
                      isDisqualified && "text-destructive"
                    )}
                  >
                    {isDisqualified ? "0.00" : entry.skore.toFixed(2)}
                  </span>
                  <p className="text-xs text-muted-foreground">kg</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
