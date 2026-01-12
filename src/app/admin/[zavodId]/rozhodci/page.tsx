"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  Shield,
  Mail,
  Check,
  Clock,
  Send,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getZavodDetail } from "@/actions/hlavni-admin.actions"
import { getPozvankyByZavod, createPozvanka, resendPozvanka, deletePozvanka } from "@/actions/pozvanka.actions"
import type { Zavod, Pozvanka } from "@/lib/types"

interface PageProps {
  params: Promise<{ zavodId: string }>
}

export default function RozhodciPage({ params }: PageProps) {
  const { zavodId } = use(params)
  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [pozvanky, setPozvanky] = useState<Pozvanka[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add referee dialog
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newRozhodci, setNewRozhodci] = useState({ jmeno: "", email: "" })
  const [isAdding, setIsAdding] = useState(false)

  // Action states
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchData = async () => {
    const [zavodResult, pozvankyResult] = await Promise.all([
      getZavodDetail(zavodId),
      getPozvankyByZavod(zavodId),
    ])

    if (zavodResult.success && zavodResult.data) {
      setZavod(zavodResult.data.zavod)
    }

    if (pozvankyResult.success && pozvankyResult.data) {
      // Filtruj pouze pozvánky pro rozhodčí
      setPozvanky(pozvankyResult.data.filter(p => p.role === 'rozhodci'))
    } else {
      setError(pozvankyResult.error?.message || 'Nepodařilo se načíst rozhodčí')
    }

    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [zavodId])

  const handleAddRozhodci = async () => {
    if (!newRozhodci.jmeno.trim() || !newRozhodci.email.trim()) {
      setError('Jméno a email jsou povinné')
      return
    }

    setIsAdding(true)
    setError(null)

    const result = await createPozvanka({
      zavodId,
      jmeno: newRozhodci.jmeno.trim(),
      email: newRozhodci.email.trim(),
      role: 'rozhodci',
    })

    if (result.success) {
      setShowAddDialog(false)
      setNewRozhodci({ jmeno: "", email: "" })
      fetchData()
    } else {
      setError(result.error?.message || 'Nepodařilo se přidat rozhodčího')
    }
    setIsAdding(false)
  }

  const handleResend = async (pozvankaId: string) => {
    setResendingId(pozvankaId)
    const result = await resendPozvanka(pozvankaId)
    if (result.success) {
      fetchData()
    } else {
      setError(result.error?.message || 'Nepodařilo se znovu odeslat pozvánku')
    }
    setResendingId(null)
  }

  const handleDelete = async (pozvankaId: string) => {
    setDeletingId(pozvankaId)
    const result = await deletePozvanka(pozvankaId)
    if (result.success) {
      setPozvanky(pozvanky.filter(p => p.id !== pozvankaId))
    } else {
      setError(result.error?.message || 'Nepodařilo se smazat pozvánku')
    }
    setDeletingId(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const registrovani = pozvanky.filter(p => p.pouzita)
  const cekajici = pozvanky.filter(p => !p.pouzita)

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
            <h1 className="text-3xl font-bold">Správa rozhodčích</h1>
            {zavod && (
              <p className="text-muted-foreground mt-1">{zavod.nazev}</p>
            )}
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
                  Zadejte email rozhodčího. Bude mu odeslána pozvánka.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="jmeno">Jméno rozhodčího</Label>
                  <Input
                    id="jmeno"
                    placeholder="Rozhodčí 1"
                    value={newRozhodci.jmeno}
                    onChange={(e) => setNewRozhodci({ ...newRozhodci, jmeno: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="rozhodci@carpclub.cz"
                    value={newRozhodci.email}
                    onChange={(e) => setNewRozhodci({ ...newRozhodci, email: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Můžete použít společný email pro rozhodčí (např. rozhodci@carpclub.cz)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Zrušit
                </Button>
                <Button onClick={handleAddRozhodci} disabled={isAdding}>
                  {isAdding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Odesílám...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Odeslat pozvánku
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
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
              <strong>Tip:</strong> Pro opakované použití můžete vytvořit jeden sdílený email
              (např. rozhodci.carpclub@seznam.cz), který předáte fyzickému rozhodčímu na místě.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rozhodčí list */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Registrovaní */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Registrovaní ({registrovani.length})
            </CardTitle>
            <CardDescription>
              Rozhodčí, kteří se přihlásili
            </CardDescription>
          </CardHeader>
          <CardContent>
            {registrovani.length > 0 ? (
              <div className="space-y-3">
                {registrovani.map((pozvanka) => (
                  <div key={pozvanka.id} className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{pozvanka.jmeno}</p>
                      <p className="text-sm text-muted-foreground truncate">{pozvanka.email}</p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Aktivní
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Zatím žádní registrovaní rozhodčí
              </p>
            )}
          </CardContent>
        </Card>

        {/* Čekající */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Čekající pozvánky ({cekajici.length})
            </CardTitle>
            <CardDescription>
              Pozvánky čekající na registraci
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cekajici.length > 0 ? (
              <div className="space-y-3">
                {cekajici.map((pozvanka) => (
                  <div key={pozvanka.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{pozvanka.jmeno}</p>
                      <p className="text-sm text-muted-foreground truncate">{pozvanka.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Odesláno: {formatDate(pozvanka.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResend(pozvanka.id)}
                        disabled={resendingId === pozvanka.id}
                        title="Znovu odeslat"
                      >
                        {resendingId === pozvanka.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={deletingId === pozvanka.id}
                          >
                            {deletingId === pozvanka.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Smazat pozvánku?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Pozvánka pro {pozvanka.jmeno} bude zrušena.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Zrušit</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(pozvanka.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Smazat
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">Žádné čekající pozvánky</p>
                <Button size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Přidat rozhodčího
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Prázdný stav */}
      {pozvanky.length === 0 && (
        <Card className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Žádní rozhodčí</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Přidejte rozhodčího pro tento závod. Rozhodčí může okamžitě potvrzovat úlovky
            a dohlížet na průběh závodu.
          </p>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Přidat prvního rozhodčího
          </Button>
        </Card>
      )}
    </div>
  )
}
