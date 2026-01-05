"use client"

import { Award, Fish, EyeOff, MapPin, Clock } from "lucide-react"
import Image from "next/image"

import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard"
import { DataDisplay } from "@/components/ui/DataDisplay"
import { SkeletonLoader } from "@/components/ui/SkeletonLoader"
import { cn } from "@/lib/utils"
import type { UlovekWithRelations } from "@/lib/types"

interface NejvetsiRybaCardProps {
  ryby: UlovekWithRelations[]
  embargoActive?: boolean
  showWeights?: boolean
  isLoading?: boolean
  limit?: number
}

/**
 * NejvetsiRybaCard - Display the biggest fish in the competition
 * 
 * Requirements:
 * - 10.2: Display "Největší ryby" section with top 10 heaviest fish
 */
export function NejvetsiRybaCard({
  ryby,
  embargoActive = false,
  showWeights = true,
  isLoading = false,
  limit = 10,
}: NejvetsiRybaCardProps) {
  const weightsVisible = showWeights && !embargoActive
  const displayRyby = ryby.slice(0, limit)

  if (isLoading) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Největší ryby
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <SkeletonLoader variant="card" height={200} />
          <div className="mt-4 space-y-2">
            <SkeletonLoader variant="text" count={3} />
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (displayRyby.length === 0) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Největší ryby
          </GlassCardTitle>
          <GlassCardDescription>
            Top {limit} nejtěžších ryb v závodě
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Fish className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Zatím žádné úlovky</p>
            <p className="text-sm mt-1">
              Největší ryby se zobrazí po potvrzení úlovků
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  // Get the biggest fish for featured display
  const biggestFish = displayRyby[0]
  const otherFish = displayRyby.slice(1)

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Největší ryby
          {embargoActive && (
            <span className="ml-auto flex items-center gap-1 text-sm font-normal text-amber-600">
              <EyeOff className="h-4 w-4" />
              Embargo
            </span>
          )}
        </GlassCardTitle>
        <GlassCardDescription>
          {weightsVisible
            ? `Top ${limit} nejtěžších ryb v závodě`
            : "Váhy jsou skryté během embarga"}
        </GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent className="space-y-4">
        {/* Featured biggest fish */}
        <FeaturedFishCard
          fish={biggestFish}
          weightsVisible={weightsVisible}
          position={1}
        />

        {/* Other top fish */}
        {otherFish.length > 0 && (
          <div className="space-y-2">
            {otherFish.map((fish, index) => (
              <FishListItem
                key={fish.id}
                fish={fish}
                weightsVisible={weightsVisible}
                position={index + 2}
              />
            ))}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}

interface FeaturedFishCardProps {
  fish: UlovekWithRelations
  weightsVisible: boolean
  position: number
}

function FeaturedFishCard({ fish, weightsVisible, position }: FeaturedFishCardProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "numeric",
    })
  }

  return (
    <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
      {/* Position badge */}
      <div className="absolute top-2 left-2 z-10 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
        <Award className="h-3 w-3" />
        #{position}
      </div>

      <div className="flex flex-col sm:flex-row">
        {/* Photo */}
        <div className="relative w-full sm:w-48 h-48 bg-muted flex-shrink-0">
          {fish.foto_url ? (
            <Image
              src={fish.foto_url}
              alt={`Největší ${fish.druh}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 192px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Fish className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">
                {fish.druh === "kapr" ? "🐟 Kapr" : "🐠 Amur"}
              </h3>
              {weightsVisible ? (
                <DataDisplay value={`${fish.vaha} kg`} size="lg" className="text-yellow-600" />
              ) : (
                <p className="text-lg text-muted-foreground">
                  Váha skryta
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {fish.tym?.nazev}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Peg {fish.tym?.peg_cislo}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(fish.cas)} {formatTime(fish.cas)}
              </span>
            </div>
            {fish.chytil && (
              <p>Chytil: {fish.chytil.jmeno}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface FishListItemProps {
  fish: UlovekWithRelations
  weightsVisible: boolean
  position: number
}

function FishListItem({ fish, weightsVisible, position }: FishListItemProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Medal colors for positions 2 and 3
  const getPositionStyle = (pos: number) => {
    switch (pos) {
      case 2:
        return "bg-gray-500/10 border-gray-500/20"
      case 3:
        return "bg-amber-500/10 border-amber-500/20"
      default:
        return "bg-muted/50"
    }
  }

  const getPositionColor = (pos: number) => {
    switch (pos) {
      case 2:
        return "text-gray-500"
      case 3:
        return "text-amber-600"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        getPositionStyle(position)
      )}
    >
      {/* Position */}
      <span
        className={cn(
          "w-6 text-center font-bold text-sm",
          getPositionColor(position)
        )}
      >
        #{position}
      </span>

      {/* Photo thumbnail */}
      <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
        {fish.foto_url ? (
          <Image
            src={fish.foto_url}
            alt={`${fish.druh}`}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Fish className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {fish.druh === "kapr" ? "🐟" : "🐠"}
          </span>
          <span className="truncate">{fish.tym?.nazev}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Peg {fish.tym?.peg_cislo} • {formatTime(fish.cas)}
        </p>
      </div>

      {/* Weight */}
      <div className="text-right flex-shrink-0">
        {weightsVisible ? (
          <span className="font-bold">{fish.vaha} kg</span>
        ) : (
          <span className="text-muted-foreground text-sm">---</span>
        )}
      </div>
    </div>
  )
}

/**
 * Compact version for sidebar display
 */
interface CompactBiggestFishProps {
  fish: UlovekWithRelations | null
  embargoActive?: boolean
  showWeights?: boolean
}

export function CompactBiggestFish({
  fish,
  embargoActive = false,
  showWeights = true,
}: CompactBiggestFishProps) {
  const weightsVisible = showWeights && !embargoActive

  if (!fish) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Zatím žádné úlovky
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
      <Award className="h-8 w-8 text-yellow-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {fish.druh === "kapr" ? "🐟 Kapr" : "🐠 Amur"}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {fish.tym?.nazev}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        {weightsVisible ? (
          <span className="text-xl font-bold text-yellow-600">
            {fish.vaha} kg
          </span>
        ) : (
          <span className="text-muted-foreground">---</span>
        )}
      </div>
    </div>
  )
}
