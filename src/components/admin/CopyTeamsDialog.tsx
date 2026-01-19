"use client"

import { useState, useEffect } from "react"
import { Copy, Loader2, Users, Calendar } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface ZavodOption {
  id: string
  nazev: string
  pocet_tymu: number
  datum_start: string
}

interface CopyTeamsDialogProps {
  targetZavodId: string
  onCopy: (sourceZavodId: string) => Promise<void>
  zavodyForCopy: ZavodOption[]
  isLoading?: boolean
}

/**
 * Dialog pro kopírování týmů z jiného závodu
 */
export function CopyTeamsDialog({
  targetZavodId,
  onCopy,
  zavodyForCopy,
  isLoading = false,
}: CopyTeamsDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedZavodId, setSelectedZavodId] = useState<string>("")
  const [isCopying, setIsCopying] = useState(false)

  // Filtrovat cílový závod ze seznamu
  const availableZavody = zavodyForCopy.filter(z => z.id !== targetZavodId)

  const selectedZavod = availableZavody.find(z => z.id === selectedZavodId)

  const handleCopy = async () => {
    if (!selectedZavodId) return

    setIsCopying(true)
    try {
      await onCopy(selectedZavodId)
      setOpen(false)
      setSelectedZavodId("")
    } finally {
      setIsCopying(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  if (availableZavody.length === 0) {
    return null // Žádné závody s týmy k dispozici
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Copy className="h-4 w-4" />
          Kopírovat týmy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kopírovat týmy z jiného závodu</DialogTitle>
          <DialogDescription>
            Vyberte závod, ze kterého chcete zkopírovat všechny týmy včetně členů.
            Platby a pegy se nepřenáší.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="source-zavod">Zdrojový závod</Label>
            <Select
              value={selectedZavodId}
              onValueChange={setSelectedZavodId}
              disabled={isCopying}
            >
              <SelectTrigger id="source-zavod">
                <SelectValue placeholder="Vyberte závod..." />
              </SelectTrigger>
              <SelectContent>
                {availableZavody.map((zavod) => (
                  <SelectItem key={zavod.id} value={zavod.id}>
                    <div className="flex items-center gap-2">
                      <span>{zavod.nazev}</span>
                      <span className="text-xs text-muted-foreground">
                        ({zavod.pocet_tymu} týmů)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedZavod && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedZavod.pocet_tymu} týmů</span>
                <span className="text-muted-foreground">bude zkopírováno</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Závod z {formatDate(selectedZavod.datum_start)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCopying}
          >
            Zrušit
          </Button>
          <Button
            onClick={handleCopy}
            disabled={!selectedZavodId || isCopying}
            className="gap-2"
          >
            {isCopying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kopíruji...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Kopírovat týmy
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
