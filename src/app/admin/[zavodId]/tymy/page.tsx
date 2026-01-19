"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  Users,
  Mail,
  Check,
  Clock,
  Search,
  CreditCard,
  MapPin,
  ChevronRight,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BulkImportDialog } from "@/components/admin/BulkImportDialog"
import { CopyTeamsDialog } from "@/components/admin/CopyTeamsDialog"
import { getTymyOverview, getZavodyForCopy, copyTeamsFromZavod } from "@/actions/tym.actions"
import { getZavodDetail } from "@/actions/hlavni-admin.actions"
import { bulkImportTeams } from "@/actions/bulk-import.actions"
import { useToast } from "@/hooks/use-toast"
import type { TymOverview, Zavod } from "@/lib/types"
import type { ParsedTeam } from "@/lib/excel-parser"

interface PageProps {
  params: Promise<{ zavodId: string }>
}

export default function TymyPage({ params }: PageProps) {
  const { zavodId } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [tymy, setTymy] = useState<TymOverview[]>([])
  const [filteredTymy, setFilteredTymy] = useState<TymOverview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [zavodyForCopy, setZavodyForCopy] = useState<Array<{
    id: string
    nazev: string
    pocet_tymu: number
    datum_start: string
  }>>([])

  const handleCopyTeams = async (sourceZavodId: string) => {
    try {
      const result = await copyTeamsFromZavod(sourceZavodId, zavodId)
      if (result.success && result.data) {
        toast({
          title: "Týmy zkopírovány",
          description: `Zkopírováno ${result.data.teamsCopied} týmů a ${result.data.membersCopied} členů`,
        })
        // Refresh data
        router.refresh()
        const tymyResult = await getTymyOverview(zavodId)
        if (tymyResult.success && tymyResult.data) {
          setTymy(tymyResult.data)
          setFilteredTymy(tymyResult.data)
        }
      } else {
        toast({
          title: "Chyba při kopírování",
          description: result.error?.message || "Nepodařilo se zkopírovat týmy",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Chyba",
        description: "Došlo k neočekávané chybě",
        variant: "destructive",
      })
    }
  }

  const handleBulkImport = async (teams: ParsedTeam[]) => {
    setIsImporting(true)
    try {
      const result = await bulkImportTeams(zavodId, teams)
      if (result.success && result.data) {
        toast({
          title: "Import dokončen",
          description: `Vytvořeno ${result.data.teamsCreated} týmů a ${result.data.membersCreated} členů`,
        })
        if (result.data.errors.length > 0) {
          console.warn("Import errors:", result.data.errors)
        }
        // Refresh data
        router.refresh()
        const tymyResult = await getTymyOverview(zavodId)
        if (tymyResult.success && tymyResult.data) {
          setTymy(tymyResult.data)
          setFilteredTymy(tymyResult.data)
        }
      } else {
        toast({
          title: "Chyba při importu",
          description: result.error?.message || "Nepodařilo se importovat týmy",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Chyba",
        description: "Došlo k neočekávané chybě",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const [zavodResult, tymyResult, zavodyResult] = await Promise.all([
        getZavodDetail(zavodId),
        getTymyOverview(zavodId),
        getZavodyForCopy(),
      ])

      if (zavodResult.success && zavodResult.data) {
        setZavod(zavodResult.data.zavod)
      }

      if (tymyResult.success && tymyResult.data) {
        setTymy(tymyResult.data)
        setFilteredTymy(tymyResult.data)
      } else {
        setError(tymyResult.error?.message || 'Nepodařilo se načíst týmy')
      }

      if (zavodyResult.success && zavodyResult.data) {
        setZavodyForCopy(zavodyResult.data)
      }

      setIsLoading(false)
    }

    fetchData()
  }, [zavodId])

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      setFilteredTymy(tymy.filter(t => t.nazev.toLowerCase().includes(query)))
    } else {
      setFilteredTymy(tymy)
    }
  }, [tymy, searchQuery])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/admin/${zavodId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Správa týmů</h1>
            {zavod && (
              <p className="text-muted-foreground mt-1">{zavod.nazev}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CopyTeamsDialog
              targetZavodId={zavodId}
              onCopy={handleCopyTeams}
              zavodyForCopy={zavodyForCopy}
            />
            <BulkImportDialog
              zavodId={zavodId}
              onImportComplete={handleBulkImport}
            >
              <Button variant="outline" className="gap-2" disabled={isImporting}>
                <Upload className="h-4 w-4" />
                Hromadný import
              </Button>
            </BulkImportDialog>
            <Link href={`/admin/${zavodId}/tymy/novy`}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nový tým
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Hledat tým..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Celkem týmů</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tymy.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Zaplaceno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tymy.filter(t => t.zaplaceno).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Registrovaných členů</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tymy.reduce((acc, t) => acc + t.pocet_registrovanych, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Týmy list */}
      {filteredTymy.length > 0 ? (
        <div className="space-y-3">
          {filteredTymy.map((tym) => (
            <Link key={tym.tym_id} href={`/admin/${zavodId}/tymy/${tym.tym_id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Barva týmu */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
                      style={{ backgroundColor: tym.barva }}
                    >
                      {tym.peg_cislo || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{tym.nazev}</h3>
                        {tym.zaplaceno ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CreditCard className="h-3 w-3 mr-1" />
                            Zaplaceno
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Nezaplaceno
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {tym.pocet_clenu} členů
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {tym.pocet_pozvanek} pozvánek
                        </span>
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          {tym.pocet_registrovanych} registrovaných
                        </span>
                        {tym.peg_cislo && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Peg {tym.peg_cislo}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          {searchQuery ? (
            <>
              <h3 className="text-lg font-semibold mb-2">Žádné výsledky</h3>
              <p className="text-muted-foreground mb-4">
                Zkuste změnit vyhledávací dotaz.
              </p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Zrušit hledání
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-2">Žádné týmy</h3>
              <p className="text-muted-foreground mb-4">
                Zatím nejsou registrované žádné týmy.
              </p>
              <Link href={`/admin/${zavodId}/tymy/novy`}>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Přidat první tým
                </Button>
              </Link>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
