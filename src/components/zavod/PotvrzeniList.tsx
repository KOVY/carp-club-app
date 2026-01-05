"use client"

import { useState } from "react"
import { Check, X, Clock, Fish, Loader2, MapPin } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard"
import { DataDisplay } from "@/components/ui/DataDisplay"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SkeletonLoader } from "@/components/ui/SkeletonLoader"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { triggerHaptic } from "@/hooks/useHapticFeedback"
import { potvrditUlovek } from "@/actions/potvrzeni.actions"
import type { UlovekWithRelations } from "@/lib/types"

interface PotvrzeniListProps {
  ulovky: UlovekWithRelations[]
  onConfirmationComplete?: () => void
  isLoading?: boolean
}

/**
 * PotvrzeniList - List of catches waiting for confirmation
 * 
 * Requirements:
 * - 4.1: Display catches waiting for confirmation from neighbor pegs
 * - 4.2: Allow captain to confirm or reject catches
 */
export function PotvrzeniList({
  ulovky,
  onConfirmationComplete,
  isLoading = false,
}: PotvrzeniListProps) {
  if (isLoading) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Úlovky k potvrzení
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <SkeletonLoader variant="card" count={2} height={150} />
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (ulovky.length === 0) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Úlovky k potvrzení
          </GlassCardTitle>
          <GlassCardDescription>
            Úlovky od sousedních týmů čekající na vaše potvrzení
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Fish className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Žádné úlovky k potvrzení</p>
            <p className="text-sm mt-1">
              Úlovky od sousedních pegů se zde zobrazí automaticky
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
          <Clock className="h-5 w-5" />
          Úlovky k potvrzení
          <StatusBadge status="pending" size="sm" className="ml-auto">
            {ulovky.length}
          </StatusBadge>
        </GlassCardTitle>
        <GlassCardDescription>
          Potvrďte nebo zamítněte úlovky od sousedních týmů
        </GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent className="space-y-4">
        {ulovky.map((ulovek) => (
          <PotvrzeniItem
            key={ulovek.id}
            ulovek={ulovek}
            onComplete={onConfirmationComplete}
          />
        ))}
      </GlassCardContent>
    </GlassCard>
  )
}

interface PotvrzeniItemProps {
  ulovek: UlovekWithRelations
  onComplete?: () => void
}

function PotvrzeniItem({ ulovek, onComplete }: PotvrzeniItemProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [poznamka, setPoznamka] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  const { toast } = useToast()

  const handleConfirm = async (potvrzeno: boolean) => {
    setIsSubmitting(true)

    try {
      const result = await potvrditUlovek({
        ulovekId: ulovek.id,
        potvrzeno,
        poznamka: poznamka || undefined,
      })

      if (result.success) {
        // Trigger haptic feedback on confirmation (Requirement 3.7)
        triggerHaptic(potvrzeno ? 'success' : 'warning')
        
        toast({
          title: potvrzeno ? "Úlovek potvrzen" : "Úlovek zamítnut",
          description: potvrzeno
            ? "Úlovek byl úspěšně potvrzen"
            : "Úlovek byl zamítnut",
        })
        onComplete?.()
      } else {
        toast({
          title: "Chyba",
          description: result.error?.message || "Nepodařilo se zpracovat potvrzení",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nastala neočekávaná chyba",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setShowRejectForm(false)
      setPoznamka("")
    }
  }

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
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex gap-4">
        {/* Photo thumbnail */}
        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {ulovek.foto_url ? (
            <Image
              src={ulovek.foto_url}
              alt={`Úlovek ${ulovek.druh}`}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Fish className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Catch details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold">
                {ulovek.druh === "kapr" ? "🐟 Kapr" : "🐠 Amur"}
              </h4>
              <DataDisplay value={`${ulovek.vaha} kg`} size="lg" />
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{formatDate(ulovek.cas)}</p>
              <p>{formatTime(ulovek.cas)}</p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Peg {ulovek.tym?.peg_cislo}
            </span>
            <span>Tým: {ulovek.tym?.nazev}</span>
          </div>

          {ulovek.chytil && (
            <p className="text-sm text-muted-foreground mt-1">
              Chytil: {ulovek.chytil.jmeno}
            </p>
          )}
        </div>
      </div>

      {/* Confirmation status */}
      {ulovek.potvrzeni && ulovek.potvrzeni.length > 0 && (
        <div className="text-sm">
          <StatusBadge status="pending" size="sm">
            Potvrzení: {ulovek.potvrzeni.filter((p) => p.potvrzeno).length} / {ulovek.potvrzeni.length}
          </StatusBadge>
        </div>
      )}

      {/* Reject form */}
      {showRejectForm && (
        <div className="space-y-2 pt-2 border-t">
          <Label htmlFor={`poznamka-${ulovek.id}`}>Důvod zamítnutí</Label>
          <Input
            id={`poznamka-${ulovek.id}`}
            placeholder="Volitelný důvod zamítnutí..."
            value={poznamka}
            onChange={(e) => setPoznamka(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        {showRejectForm ? (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowRejectForm(false)
                setPoznamka("")
              }}
              disabled={isSubmitting}
            >
              Zrušit
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => handleConfirm(false)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Zamítnout
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowRejectForm(true)}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Zamítnout
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleConfirm(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Potvrdit
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
