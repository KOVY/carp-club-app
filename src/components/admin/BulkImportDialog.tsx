"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Upload,
  FileSpreadsheet,
  Download,
  Users,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { parseFile, downloadTemplate, type ParseResult, type ParsedTeam } from "@/lib/excel-parser"
import { cn } from "@/lib/utils"

interface BulkImportDialogProps {
  zavodId: string
  onImportComplete: (teams: ParsedTeam[]) => void
  children?: React.ReactNode
}

export function BulkImportDialog({
  zavodId,
  onImportComplete,
  children,
}: BulkImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [showWarnings, setShowWarnings] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true)
    setParseResult(null)

    try {
      const result = await parseFile(file)
      setParseResult(result)
    } catch (error) {
      setParseResult({
        success: false,
        teams: [],
        errors: [error instanceof Error ? error.message : "Nepodařilo se načíst soubor"],
        warnings: [],
        totalMembers: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleConfirmImport = () => {
    if (parseResult?.success && parseResult.teams.length > 0) {
      onImportComplete(parseResult.teams)
      setOpen(false)
      setParseResult(null)
    }
  }

  const handleReset = () => {
    setParseResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Hromadný import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Hromadný import týmů
          </DialogTitle>
          <DialogDescription>
            Nahrajte Excel nebo CSV soubor se seznamem týmů a jejich členů.
          </DialogDescription>
        </DialogHeader>

        {!parseResult ? (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
                isLoading && "pointer-events-none opacity-50"
              )}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Načítám soubor...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Přetáhněte soubor sem nebo
                  </p>
                  <label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <Button variant="outline" asChild className="cursor-pointer">
                      <span>Vybrat soubor</span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-4">
                    Podporované formáty: .xlsx, .xls, .csv
                  </p>
                </>
              )}
            </div>

            {/* Template download */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium text-sm">Šablona pro import</p>
                <p className="text-xs text-muted-foreground">
                  Stáhněte šablonu s očekávaným formátem dat
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Stáhnout
              </Button>
            </div>

            {/* Format info */}
            <div className="p-4 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium mb-2">Očekávaný formát sloupců:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>Tým</strong> - Název týmu (povinné)</li>
                <li><strong>Jméno</strong> - Jméno a příjmení člena (povinné)</li>
                <li><strong>Email</strong> - Email člena (volitelné, pro pozvánky)</li>
                <li><strong>Telefon</strong> - Telefonní číslo (volitelné)</li>
                <li><strong>Role</strong> - kapitan nebo zavodnik (volitelné, výchozí: zavodnik)</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Result summary */}
            {parseResult.success ? (
              <Card className="border-green-500/50 bg-green-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    Soubor úspěšně načten
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <strong>{parseResult.teams.length}</strong> týmů
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <strong>{parseResult.totalMembers}</strong> členů
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <X className="h-5 w-5" />
                    Chyba při načítání
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside text-sm text-destructive space-y-1">
                    {parseResult.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Warnings */}
            {parseResult.warnings.length > 0 && (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <button
                    onClick={() => setShowWarnings(!showWarnings)}
                    className="flex items-center justify-between w-full"
                  >
                    <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-base">
                      <AlertTriangle className="h-5 w-5" />
                      {parseResult.warnings.length} upozornění
                    </CardTitle>
                    {showWarnings ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </CardHeader>
                {showWarnings && (
                  <CardContent>
                    <ul className="list-disc list-inside text-sm text-amber-600 dark:text-amber-400 space-y-1 max-h-32 overflow-y-auto">
                      {parseResult.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Teams preview */}
            {parseResult.success && parseResult.teams.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 font-medium text-sm">
                  Náhled týmů
                </div>
                <div className="max-h-64 overflow-y-auto divide-y">
                  {parseResult.teams.map((team, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{team.nazev}</span>
                        <span className="text-sm text-muted-foreground">
                          {team.members.length} členů
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {team.members.map((m, j) => (
                          <span key={j}>
                            {j > 0 && ", "}
                            {m.jmeno}
                            {m.role === "kapitan" && " (K)"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleReset}>
                Nahrát jiný soubor
              </Button>
              {parseResult.success && (
                <Button onClick={handleConfirmImport}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Importovat {parseResult.teams.length} týmů
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
