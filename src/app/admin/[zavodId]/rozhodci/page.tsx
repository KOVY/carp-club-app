"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  Shield,
  Search,
  Trash2,
  Loader2,
  UserPlus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getZavodDetail } from "@/actions/hlavni-admin.actions"
import {
  getRozhodciZavodu,
  hledatUzivatele,
  prirazitRozhodci,
  odebratRozhodci,
  type RozhodciUzivatel,
} from "@/actions/rozhodci.actions"
import type { Zavod } from "@/lib/types"

interface PageProps {
  params: Promise<{ zavodId: string }>
}

export default function RozhodciPage({ params }: PageProps) {
  const { zavodId } = use(params)
  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [rozhodci, setRozhodci] = useState<RozhodciUzivatel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add referee dialog (vyhledání registrovaného uživatele)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [query, setQuery] = useState("")
  const [vysledky, setVysledky] = useState<RozhodciUzivatel[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const fetchData = async () => {
    const [zavodResult, rozhodciResult] = await Promise.all([
      getZavodDetail(zavodId),
      getRozhodciZavodu(zavodId),
    ])
    if (zavodResult.success && zavodResult.data) setZavod(zavodResult.data.zavod)
    if (rozhodciResult.success && rozhodciResult.data) {
      setRozhodci(rozhodciResult.data)
    } else {
      setError(rozhodciResult.error?.message || "Nepodařilo se načíst rozhodčí")
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [zavodId])

  // Vyhledávání s debounce
  useEffect(() => {
    if (!showAddDialog) return
    const q = query.trim()
    if (q.length < 2) {
      setVysledky([])
      return
    }
    setIsSearching(true)
    const t = setTimeout(async () => {
      const r = await hledatUzivatele(zavodId, q)
      setVysledky(r.success ? r.data ?? [] : [])
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query, showAddDialog, zavodId])

  const handleAdd = async (userId: string) => {
    setAddingId(userId)
    setError(null)
    const result = await prirazitRozhodci(zavodId, userId)
    if (result.success) {
      setShowAddDialog(false)
      setQuery("")
      setVysledky([])
      fetchData()
    } else {
      setError(result.error?.message || "Nepodařilo se přidat rozhodčího")
    }
    setAddingId(null)
  }

  const handleRemove = async (userId: string) => {
    setRemovingId(userId)
    const result = await odebratRozhodci(zavodId, userId)
    if (result.success) {
      setRozhodci(rozhodci.filter((r) => r.userId !== userId))
    } else {
      setError(result.error?.message || "Nepodařilo se odebrat rozhodčího")
    }
    setRemovingId(null)
  }

  const alreadyRozhodci = (userId: string) => rozhodci.some((r) => r.userId === userId)

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
      <div className="flex items-center gap-4">
        <Link href={`/admin/${zavodId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Správa rozhodčích</h1>
          {zavod && <p className="text-muted-foreground mt-1">{zavod.nazev}</p>}
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Přidat rozhodčího
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Přidat rozhodčího</DialogTitle>
              <DialogDescription>
                Najděte registrovaného uživatele podle jména nebo e-mailu a přiřaďte mu roli rozhodčího.
                Rozhodčí se musí nejdřív sám zaregistrovat (e-mail+heslo nebo Google).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="search">Jméno nebo e-mail</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    className="pl-9"
                    placeholder="např. Novák / novak@email.cz"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="min-h-[120px]">
                {isSearching ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Hledám…
                  </div>
                ) : query.trim().length < 2 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Zadejte alespoň 2 znaky pro vyhledávání.
                  </p>
                ) : vysledky.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nikdo nenalezen. Uživatel se musí nejdřív zaregistrovat na webu.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {vysledky.map((u) => {
                      const existing = alreadyRozhodci(u.userId)
                      return (
                        <div key={u.userId} className="flex items-center gap-3 p-2 rounded-lg border">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Shield className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{u.jmeno}</p>
                            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                          </div>
                          <Button
                            size="sm"
                            disabled={existing || addingId === u.userId}
                            onClick={() => handleAdd(u.userId)}
                          >
                            {addingId === u.userId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : existing ? (
                              "Už je rozhodčí"
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-1" /> Přidat
                              </>
                            )}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Info card */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-700 dark:text-blue-400">Co může rozhodčí?</h3>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              <li>• Okamžitě potvrzovat úlovky bez čekání na sousední pegy</li>
              <li>• Zamítat neplatné úlovky (špatně vytažená ryba apod.)</li>
              <li>• Udělovat žluté karty týmům</li>
              <li>• Vidět leaderboard i během embarga</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              <strong>Nově bez e-mailových pozvánek:</strong> rozhodčí se zaregistruje sám jako každý jiný
              a vy mu tady jen přiřadíte roli.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Aktuální rozhodčí */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Rozhodčí závodu ({rozhodci.length})
          </CardTitle>
          <CardDescription>Uživatelé s rolí rozhodčího pro tento závod</CardDescription>
        </CardHeader>
        <CardContent>
          {rozhodci.length > 0 ? (
            <div className="space-y-3">
              {rozhodci.map((r) => (
                <div key={r.userId} className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.jmeno}</p>
                    <p className="text-sm text-muted-foreground truncate">{r.email}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={removingId === r.userId}
                      >
                        {removingId === r.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Odebrat rozhodčího?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {r.jmeno} přijde o roli rozhodčího v tomto závodě. Účet uživatele zůstane.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Zrušit</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemove(r.userId)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Odebrat
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Žádní rozhodčí</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Přidejte rozhodčího — vyhledejte registrovaného uživatele a přiřaďte mu roli.
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Přidat rozhodčího
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
