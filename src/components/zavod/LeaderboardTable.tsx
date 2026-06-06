"use client"

import { Trophy, Fish, AlertTriangle, EyeOff, Medal } from "lucide-react"

import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SkeletonLoader } from "@/components/ui/SkeletonLoader"
import { AnimatedScore } from "./AnimatedScore"
import { cn } from "@/lib/utils"
import type { LeaderboardEntry } from "@/lib/types"

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  embargoActive?: boolean
  showWeights?: boolean
  isLoading?: boolean
  prahKaret?: number
}

/**
 * LeaderboardTable - Display competition leaderboard
 *
 * Requirements:
 * - 5.1: Display team rankings based on score (sum of top 7 fish - Pravidla 2026)
 * - 5.7: Respect embargo (hide weights during embargo)
 */
export function LeaderboardTable({
  entries,
  embargoActive = false,
  showWeights = true,
  isLoading = false,
  prahKaret = 3,
}: LeaderboardTableProps) {
  // Determine if weights should be visible
  const weightsVisible = showWeights && !embargoActive

  if (isLoading) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Pořadí
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <SkeletonLoader variant="table-row" count={5} />
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (entries.length === 0) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Pořadí
          </GlassCardTitle>
          <GlassCardDescription>
            Aktuální pořadí týmů v závodě
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Fish className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Zatím žádné výsledky</p>
            <p className="text-sm mt-1">
              Pořadí se zobrazí po potvrzení prvních úlovků
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Pořadí
          {embargoActive && (
            <span className="ml-auto flex items-center gap-1 text-sm font-normal text-amber-600">
              <EyeOff className="h-4 w-4" />
              Embargo aktivní
            </span>
          )}
        </GlassCardTitle>
        <GlassCardDescription>
          {weightsVisible
            ? "Aktuální pořadí týmů podle součtu top 7 ryb"
            : "Váhy jsou skryté během embarga"}
        </GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent>
        {/* Mobile Cards View */}
        <div className="md:hidden space-y-3">
          {entries.map((entry, index) => (
            <LeaderboardCard
              key={entry.tym.id}
              entry={entry}
              position={index + 1}
              weightsVisible={weightsVisible}
              prahKaret={prahKaret}
            />
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Tým</TableHead>
                <TableHead className="text-center">Peg</TableHead>
                <TableHead className="text-center">Ryby</TableHead>
                {weightsVisible && (
                  <TableHead className="text-right">Skóre</TableHead>
                )}
                <TableHead className="text-center w-16">ŽK</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <LeaderboardRow
                  key={entry.tym.id}
                  entry={entry}
                  position={index + 1}
                  weightsVisible={weightsVisible}
                  prahKaret={prahKaret}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  position: number
  weightsVisible: boolean
  prahKaret?: number
}

/**
 * Mobile card view for leaderboard entry
 */
function LeaderboardCard({ entry, position, weightsVisible, prahKaret = 3 }: LeaderboardRowProps) {
  const { tym, skore, pocetRyb, zluteKarty } = entry
  const isDisqualified = entry.isDisqualified ?? false

  const getMedalColor = (pos: number) => {
    switch (pos) {
      case 1:
        return "text-yellow-500 bg-yellow-500/10"
      case 2:
        return "text-gray-400 bg-gray-500/10"
      case 3:
        return "text-amber-600 bg-amber-500/10"
      default:
        return "text-muted-foreground bg-muted/50"
    }
  }

  const isLeader = position === 1 && !isDisqualified

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card transition-shadow",
        // Vedoucí: hrdina – halo (noc) / pevný okraj (den), vyšší padding pro váhu
        isLeader && "halo-card border-primary p-4",
        // Top 2-3: jemnější zvýraznění
        position > 1 && position <= 3 && !isDisqualified && "border-primary/30 p-3",
        // Zbytek
        position > 3 && !isDisqualified && "border-border p-3",
        // Diskvalifikace přebíjí vše
        isDisqualified && "opacity-50 bg-destructive/5 border-destructive/20 p-3"
      )}
    >
      {/* Position */}
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-bold flex-shrink-0",
          isLeader ? "w-12 h-12 text-xl" : "w-10 h-10 text-lg",
          getMedalColor(position),
          // Zlatá zář jen pro vedoucího
          isLeader && "medal-glow-1"
        )}
      >
        {position <= 3 ? (
          <Medal className={cn(isLeader ? "h-6 w-6" : "h-5 w-5")} />
        ) : (
          position
        )}
      </div>

      {/* Team info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={cn(
              "truncate",
              isLeader ? "font-bold text-foreground" : "font-medium text-card-foreground",
              isDisqualified && "line-through"
            )}
          >
            {tym.nazev}
          </p>
          {isDisqualified && (
            <span className="text-xs bg-destructive/10 text-destructive font-semibold px-1.5 py-0.5 rounded">
              Diskvalifikováno
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Peg {tym.peg_cislo ?? "-"}</span>
          <span className="flex items-center gap-1">
            <Fish className="h-3 w-3" />
            {pocetRyb}
          </span>
          {zluteKarty > 0 && (
            <span className={cn(
              "flex items-center gap-1",
              zluteKarty >= prahKaret ? "text-destructive" : "text-amber-500"
            )}>
              <AlertTriangle className="h-3 w-3" />
              {zluteKarty} ŽK
            </span>
          )}
        </div>
      </div>

      {/* Score – váha jako hrdina (akcentní, velká, BEZ glow na číslech) */}
      {weightsVisible && (
        <div className="text-right flex-shrink-0">
          {isDisqualified ? (
            <span className="text-destructive font-mono text-xl font-extrabold">0.00</span>
          ) : (
            <AnimatedScore
              value={skore}
              decimals={2}
              duration={1500}
              delay={position * 100}
              animationKey={`${entry.tym.id}-${skore}`}
              className={cn(
                "font-mono font-extrabold text-accent tabular-nums",
                isLeader ? "text-2xl" : "text-xl"
              )}
            />
          )}
          <p className="text-xs text-muted-foreground">kg</p>
        </div>
      )}
    </div>
  )
}

function LeaderboardRow({ entry, position, weightsVisible, prahKaret = 3 }: LeaderboardRowProps) {
  const { tym, skore, pocetRyb, zluteKarty } = entry
  const isDisqualified = entry.isDisqualified ?? false

  // Medal colors for top 3
  const getMedalColor = (pos: number) => {
    switch (pos) {
      case 1:
        return "text-yellow-500"
      case 2:
        return "text-gray-400"
      case 3:
        return "text-amber-600"
      default:
        return "text-muted-foreground"
    }
  }

  const isLeader = position === 1 && !isDisqualified

  return (
    <TableRow
      className={cn(
        isDisqualified && "opacity-50 bg-destructive/5",
        position <= 3 && !isDisqualified && "font-medium",
        // Řádek vedoucího: jemné akcentní pozadí + levý akcent okraj, drží čitelnost
        isLeader && "bg-primary/5 border-l-4 border-l-primary font-bold"
      )}
    >
      {/* Position */}
      <TableCell>
        <div className="flex items-center gap-1">
          {position <= 3 ? (
            <Medal
              className={cn(
                getMedalColor(position),
                // Vedoucí: větší medaile + zlatá zář (kruh kolem ikony)
                isLeader ? "h-7 w-7 rounded-full medal-glow-1" : "h-5 w-5"
              )}
            />
          ) : (
            <span className="text-muted-foreground w-5 text-center">
              {position}
            </span>
          )}
        </div>
      </TableCell>

      {/* Team name */}
      <TableCell>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              isLeader && "text-foreground",
              isDisqualified && "line-through"
            )}
          >
            {tym.nazev}
          </span>
          {isDisqualified && (
            <span className="text-xs bg-destructive/10 text-destructive font-semibold px-1.5 py-0.5 rounded">
              Diskvalifikováno
            </span>
          )}
        </div>
      </TableCell>

      {/* Peg number */}
      <TableCell className="text-center">
        {tym.peg_cislo ?? "-"}
      </TableCell>

      {/* Fish count */}
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Fish className="h-4 w-4 text-muted-foreground" />
          {pocetRyb}
        </div>
      </TableCell>

      {/* Score (if visible) – váha jako hrdina, BEZ glow na číslech */}
      {weightsVisible && (
        <TableCell className="text-right font-mono">
          {isDisqualified ? (
            <span className="text-destructive text-lg font-bold">0.00 kg</span>
          ) : (
            <AnimatedScore
              value={skore}
              decimals={2}
              suffix=" kg"
              duration={1500}
              delay={position * 100}
              animationKey={`${entry.tym.id}-${skore}`}
              className={cn(
                "font-bold text-accent tabular-nums",
                isLeader ? "text-xl" : "text-lg"
              )}
            />
          )}
        </TableCell>
      )}

      {/* Yellow cards */}
      <TableCell className="text-center">
        {zluteKarty > 0 ? (
          <div className="flex items-center justify-center gap-1">
            <AlertTriangle
              className={cn(
                "h-4 w-4",
                zluteKarty >= prahKaret ? "text-destructive" : "text-amber-500"
              )}
            />
            <span
              className={cn(
                "text-sm font-medium",
                zluteKarty >= prahKaret ? "text-destructive" : "text-amber-500"
              )}
            >
              {zluteKarty}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
    </TableRow>
  )
}

/**
 * Compact leaderboard for sidebar or mobile view
 */
interface CompactLeaderboardProps {
  entries: LeaderboardEntry[]
  embargoActive?: boolean
  showWeights?: boolean
  limit?: number
  prahKaret?: number
}

export function CompactLeaderboard({
  entries,
  embargoActive = false,
  showWeights = true,
  limit = 5,
  prahKaret = 3,
}: CompactLeaderboardProps) {
  const weightsVisible = showWeights && !embargoActive
  const displayEntries = entries.slice(0, limit)

  if (displayEntries.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Zatím žádné výsledky
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {embargoActive && (
        <div className="flex items-center gap-1 text-xs text-amber-600 mb-2">
          <EyeOff className="h-3 w-3" />
          Embargo aktivní
        </div>
      )}
      {displayEntries.map((entry, index) => (
        <div
          key={entry.tym.id}
          className={cn(
            "flex items-center gap-3 p-2 rounded-md",
            index === 0 && "bg-yellow-500/10",
            index === 1 && "bg-gray-500/10",
            index === 2 && "bg-amber-500/10",
            entry.isDisqualified && "opacity-50"
          )}
        >
          <span
            className={cn(
              "w-6 text-center font-bold",
              index === 0 && "text-yellow-500",
              index === 1 && "text-gray-400",
              index === 2 && "text-amber-600"
            )}
          >
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{entry.tym.nazev}</p>
            <p className="text-xs text-muted-foreground">
              {entry.pocetRyb} {entry.pocetRyb === 1 ? "ryba" : entry.pocetRyb < 5 ? "ryby" : "ryb"}
              {weightsVisible && (
                <>
                  {" • "}
                  <AnimatedScore
                    value={entry.skore}
                    decimals={2}
                    suffix=" kg"
                    duration={1200}
                    delay={index * 80}
                    className="inline"
                  />
                </>
              )}
            </p>
          </div>
          {entry.zluteKarty > 0 && (
            <AlertTriangle
              className={cn(
                "h-4 w-4 flex-shrink-0",
                entry.zluteKarty >= prahKaret ? "text-destructive" : "text-amber-500"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
