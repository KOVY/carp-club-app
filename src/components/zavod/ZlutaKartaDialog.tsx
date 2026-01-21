"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { udelitZlutouKartu } from "@/actions/admin.actions"
import type { TymWithRelations } from "@/lib/types"

interface ZlutaKartaDialogProps {
  zavodId: string
  tym: TymWithRelations
  currentYellowCards?: number
  onSuccess?: () => void
  trigger?: React.ReactNode
}

/**
 * ZlutaKartaDialog - Dialog for issuing a yellow card to a team
 * 
 * Requirements:
 * - 7.1: Record yellow card with reason and time
 * - 7.2: Only rozhodci/poradatel can issue yellow cards (enforced by server action)
 * - 7.3: 2 yellow cards = disqualification (handled by database trigger)
 */
export function ZlutaKartaDialog({
  zavodId,
  tym,
  currentYellowCards = 0,
  onSuccess,
  trigger,
}: ZlutaKartaDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [duvod, setDuvod] = useState("")
  const [stopkaHodin, setStopkaHodin] = useState<string>("0") // "0" = bez stopky, "3" = 3 hodiny, "6" = 6 hodin
  const { toast } = useToast()

  const willBeDisqualified = currentYellowCards >= 1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!duvod.trim()) {
      toast({
        title: "Chyba",
        description: "Důvod žluté karty je povinný",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const stopkaValue = parseInt(stopkaHodin, 10)
      const result = await udelitZlutouKartu({
        tymId: tym.id,
        zavodId,
        duvod: duvod.trim(),
        stopkaHodin: stopkaValue > 0 ? stopkaValue : null,
      })

      if (result.success) {
        const cardCount = result.data?.cardCount || currentYellowCards + 1
        const hasStopka = result.data?.stopkaDo !== null

        let description = ""
        if (cardCount >= 2) {
          description = `Tým ${tym.nazev} byl diskvalifikován (2. žlutá karta)`
        } else if (hasStopka) {
          description = `Tým ${tym.nazev} obdržel ${cardCount}. žlutou kartu se stopkou na ${stopkaHodin} hodin`
        } else {
          description = `Tým ${tym.nazev} obdržel ${cardCount}. žlutou kartu`
        }

        toast({
          title: "Žlutá karta udělena",
          description,
          variant: cardCount >= 2 ? "destructive" : "default",
        })

        setOpen(false)
        setDuvod("")
        setStopkaHodin("0")
        onSuccess?.()
      } else {
        toast({
          title: "Chyba",
          description: result.error?.message || "Nepodařilo se udělit žlutou kartu",
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
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen)
      if (!newOpen) {
        setDuvod("")
        setStopkaHodin("0")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-amber-600 hover:text-amber-700">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Žlutá karta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Udělit žlutou kartu
            </DialogTitle>
            <DialogDescription>
              Udělujete žlutou kartu týmu <strong>{tym.nazev}</strong>
              {tym.peg_cislo && ` (Peg ${tym.peg_cislo})`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Warning for disqualification */}
            {willBeDisqualified && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Pozor: Diskvalifikace</p>
                    <p className="mt-1">
                      Tým již má {currentYellowCards} žlutou kartu. 
                      Udělením další karty bude tým diskvalifikován a všechny jeho body budou vynulovány.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Current yellow cards info */}
            {currentYellowCards > 0 && !willBeDisqualified && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    Tým má aktuálně {currentYellowCards} žlutou kartu
                  </span>
                </div>
              </div>
            )}

            {/* Reason input */}
            <div className="space-y-2">
              <Label htmlFor="duvod">Důvod *</Label>
              <Input
                id="duvod"
                placeholder="Zadejte důvod udělení žluté karty..."
                value={duvod}
                onChange={(e) => setDuvod(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Důvod bude zaznamenán v audit logu a nelze jej později změnit
              </p>
            </div>

            {/* Stopka selection */}
            <div className="space-y-2">
              <Label htmlFor="stopka" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Stopka (zákaz chytání)
              </Label>
              <Select
                value={stopkaHodin}
                onValueChange={setStopkaHodin}
                disabled={isSubmitting}
              >
                <SelectTrigger id="stopka">
                  <SelectValue placeholder="Vyberte délku stopky" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Bez stopky</SelectItem>
                  <SelectItem value="3">3 hodiny</SelectItem>
                  <SelectItem value="6">6 hodin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Během stopky tým nesmí zadávat nové úlovky
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              variant={willBeDisqualified ? "destructive" : "default"}
              disabled={isSubmitting || !duvod.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ukládám...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {willBeDisqualified ? "Diskvalifikovat" : "Udělit kartu"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Yellow card badge component for displaying current card count
 */
interface YellowCardBadgeProps {
  count: number
  className?: string
}

export function YellowCardBadge({ count, className }: YellowCardBadgeProps) {
  if (count === 0) return null

  const isDisqualified = count >= 2

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isDisqualified
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/10 text-amber-600"
      } ${className || ""}`}
    >
      <AlertTriangle className="h-3 w-3" />
      {count}x ŽK
      {isDisqualified && " (DQ)"}
    </div>
  )
}
