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
import { cn } from "@/lib/utils"
import type { LeaderboardEntry } from "@/lib/types"

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  embargoActive?: boolean
  showWeights?: boolean
  isLoading?: boolean
}

/**
 * LeaderboardTable - Display competition leaderboard
 * 
 * Requirements:
 * - 5.1: Display team rankings based on score (sum of top 5 fish)
 * - 5.7: Respect embargo (hide weights during embargo)
 */
export function LeaderboardTable({
  entries,
  embargoActive = false,
  showWeights = true,
  isLoading = false,
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
            ? "Aktuální pořadí týmů podle součtu top 5 ryb"
            : "Váhy jsou skryté během embarga"}
        </GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent>
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
              />
            ))}
          </TableBody>
        </Table>
      </GlassCardContent>
    </GlassCard>
  )
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  position: number
  weightsVisible: boolean
}

function LeaderboardRow({ entry, position, weightsVisible }: LeaderboardRowProps) {
  const { tym, skore, pocetRyb, zluteKarty } = entry
  const isDisqualified = zluteKarty >= 2

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

  return (
    <TableRow
      className={cn(
        isDisqualified && "opacity-50 bg-destructive/5",
        position <= 3 && "font-medium"
      )}
    >
      {/* Position */}
      <TableCell>
        <div className="flex items-center gap-1">
          {position <= 3 ? (
            <Medal className={cn("h-5 w-5", getMedalColor(position))} />
          ) : (
            <span className="text-muted-foreground w-5 text-center">
              {position}
            </span>
          )}
        </div>
      </TableCell>

      {/* Team name */}
      <TableCell>
        <div className="flex items-center gap-2">
          <span className={cn(isDisqualified && "line-through")}>
            {tym.nazev}
          </span>
          {isDisqualified && (
            <span className="text-xs text-destructive">(DQ)</span>
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

      {/* Score (if visible) */}
      {weightsVisible && (
        <TableCell className="text-right font-mono">
          {isDisqualified ? (
            <span className="text-destructive">0.00</span>
          ) : (
            <span>{skore.toFixed(2)} kg</span>
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
                zluteKarty >= 2 ? "text-destructive" : "text-amber-500"
              )}
            />
            <span
              className={cn(
                "text-sm font-medium",
                zluteKarty >= 2 ? "text-destructive" : "text-amber-500"
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
}

export function CompactLeaderboard({
  entries,
  embargoActive = false,
  showWeights = true,
  limit = 5,
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
            entry.zluteKarty >= 2 && "opacity-50"
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
              {weightsVisible && ` • ${entry.skore.toFixed(2)} kg`}
            </p>
          </div>
          {entry.zluteKarty > 0 && (
            <AlertTriangle
              className={cn(
                "h-4 w-4 flex-shrink-0",
                entry.zluteKarty >= 2 ? "text-destructive" : "text-amber-500"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
