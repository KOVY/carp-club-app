"use client"

import { Fish, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
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
import type { UlovekWithRelations } from "@/lib/types"

interface TymoveUlovkyListProps {
  ulovky: UlovekWithRelations[]
  isLoading?: boolean
}

/**
 * TymoveUlovkyList - Display team's catches with confirmation status
 *
 * Shows all catches submitted by the user's team with a traffic light
 * indicator for confirmation status:
 * - Yellow (pending): Waiting for confirmation
 * - Green (confirmed): Catch confirmed
 * - Red (rejected): Catch rejected
 */
export function TymoveUlovkyList({
  ulovky,
  isLoading = false,
}: TymoveUlovkyListProps) {
  if (isLoading) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Fish className="h-5 w-5" />
            Úlovky mého týmu
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <SkeletonLoader variant="card" count={2} height={100} />
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (ulovky.length === 0) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Fish className="h-5 w-5" />
            Úlovky mého týmu
          </GlassCardTitle>
          <GlassCardDescription>
            Přehled všech úlovků vašeho týmu
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Fish className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Zatím žádné úlovky</p>
            <p className="text-sm mt-1">
              Zadejte svůj první úlovek pomocí formuláře
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  // Count by status
  const confirmed = ulovky.filter((u) => u.stav === "potvrzeno").length
  const pending = ulovky.filter((u) => u.stav === "ceka").length
  const rejected = ulovky.filter((u) => u.stav === "zamitnuto").length

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <Fish className="h-5 w-5" />
          Úlovky mého týmu
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {ulovky.length} celkem
          </span>
        </GlassCardTitle>
        <GlassCardDescription>
          <div className="flex gap-4 mt-1">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              {pending} čeká
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              {confirmed} potvrzeno
            </span>
            {rejected > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                {rejected} zamítnuto
              </span>
            )}
          </div>
        </GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent className="space-y-3">
        {ulovky.map((ulovek) => (
          <TymoveUlovkyItem key={ulovek.id} ulovek={ulovek} />
        ))}
      </GlassCardContent>
    </GlassCard>
  )
}

interface TymoveUlovkyItemProps {
  ulovek: UlovekWithRelations
}

function TymoveUlovkyItem({ ulovek }: TymoveUlovkyItemProps) {
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

  // Get status info
  const getStatusInfo = () => {
    switch (ulovek.stav) {
      case "potvrzeno":
        return {
          icon: CheckCircle2,
          color: "text-green-500",
          bgColor: "bg-green-500",
          label: "Potvrzeno",
        }
      case "zamitnuto":
        return {
          icon: XCircle,
          color: "text-red-500",
          bgColor: "bg-red-500",
          label: "Zamítnuto",
        }
      default:
        return {
          icon: Clock,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500",
          label: "Čeká na potvrzení",
        }
    }
  }

  const status = getStatusInfo()
  const StatusIcon = status.icon

  // Count confirmations
  const confirmedCount = ulovek.potvrzeni?.filter((p) => p.potvrzeno).length || 0
  const rejectedCount = ulovek.potvrzeni?.filter((p) => !p.potvrzeno).length || 0

  return (
    <div className="border rounded-lg p-3 flex gap-3 items-center">
      {/* Status indicator (traffic light) */}
      <div
        className={`w-4 h-4 rounded-full ${status.bgColor} flex-shrink-0 shadow-lg`}
        title={status.label}
      />

      {/* Photo thumbnail */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        {ulovek.foto_url ? (
          <Image
            src={ulovek.foto_url}
            alt={`Úlovek ${ulovek.druh}`}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Fish className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Catch details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {ulovek.druh === "kapr" ? "Kapr" : "Amur"}
          </span>
          <DataDisplay value={`${ulovek.vaha} kg`} size="md" />
        </div>

        <div className="text-sm text-muted-foreground">
          {formatDate(ulovek.cas)} {formatTime(ulovek.cas)}
          {ulovek.chytil && ` • ${ulovek.chytil.jmeno}`}
        </div>

        {/* Confirmation progress for pending catches */}
        {ulovek.stav === "ceka" && (
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {confirmedCount > 0
              ? `${confirmedCount} potvrzení`
              : "Čeká na potvrzení od sousedů"}
          </div>
        )}

        {/* Show rejection reason if rejected */}
        {ulovek.stav === "zamitnuto" && rejectedCount > 0 && (
          <div className="text-xs text-red-500 mt-1">
            {ulovek.potvrzeni?.find((p) => !p.potvrzeno)?.poznamka ||
              "Zamítnuto sousedem"}
          </div>
        )}
      </div>

      {/* Status icon */}
      <StatusIcon className={`h-5 w-5 ${status.color} flex-shrink-0`} />
    </div>
  )
}

export default TymoveUlovkyList
