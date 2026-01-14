"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Users,
  Mail,
  Check,
  Clock,
  Plus,
  Trash2,
  Send,
  RefreshCw,
  Palette,
  CreditCard,
  MapPin,
  Loader2,
  Edit,
  Save,
  X,
  Copy,
  Link as LinkIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getTymDetail, updateTym, deleteTym } from "@/actions/tym.actions"
import { getPozvankyByTym, createPozvanka, resendPozvanka, deletePozvanka } from "@/actions/pozvanka.actions"
import { TEAM_COLORS } from "@/lib/types"
import type { Tym, Pozvanka, ClenTymuWithUser } from "@/lib/types"

interface PageProps {
  params: Promise<{ zavodId: string; tymId: string }>
}

export default function TymDetailPage({ params }: PageProps) {
  const { zavodId, tymId } = use(params)
  const router = useRouter()
  const [tym, setTym] = useState<(Tym & { clenove?: ClenTymuWithUser[] }) | null>(null)
  const [pozvanky, setPozvanky] = useState<Pozvanka[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ nazev: "", barva: "", zaplaceno: false })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Add member dialog
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMember, setNewMember] = useState<{ jmeno: string; email: string; telefon: string; role: "zavodnik" | "kapitan" }>({ jmeno: "", email: "", telefon: "", role: "zavodnik" })
  const [isAddingMember, setIsAddingMember] = useState(false)

  // Resending state
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [deletingPozvankaId, setDeletingPozvankaId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyInviteLink = async (token: string, pozvankaId: string) => {
    const link = `${window.location.origin}/pozvanka/${token}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(pozvankaId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = link
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedId(pozvankaId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const fetchData = async () => {
    const [tymResult, pozvankyResult] = await Promise.all([
      getTymDetail(tymId),
      getPozvankyByTym(tymId),
    ])

    if (tymResult.success && tymResult.data) {
      setTym(tymResult.data)
      setEditData({
        nazev: tymResult.data.nazev,
        barva: tymResult.data.barva,
        zaplaceno: tymResult.data.zaplaceno,
      })
    } else {
      setError(tymResult.error?.message || 'Nepodařilo se načíst tým')
    }

    if (pozvankyResult.success && pozvankyResult.data) {
      setPozvanky(pozvankyResult.data)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [tymId])

  const handleSaveEdit = async () => {
    setIsSaving(true)
    setError(null)

    const result = await updateTym(tymId, {
      nazev: editData.nazev,
      barva: editData.barva,
      zaplaceno: editData.zaplaceno,
    })

    if (result.success && result.data) {
      setTym({ ...tym!, ...result.data })
      setIsEditing(false)
    } else {
      setError(result.error?.message || 'Nepodařilo se uložit změny')
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteTym(tymId)
    if (result.success) {
      router.push(`/admin/${zavodId}/tymy`)
    } else {
      setError(result.error?.message || 'Nepodařilo se smazat tým')
      setIsDeleting(false)
    }
  }

  const handleAddMember = async () => {
    if (!newMember.jmeno.trim() || !newMember.email.trim()) {
      setError('Jméno a email jsou povinné')
      return
    }

    setIsAddingMember(true)
    setError(null)

    const result = await createPozvanka({
      zavodId,
      tymId,
      jmeno: newMember.jmeno.trim(),
      email: newMember.email.trim(),
      telefon: newMember.telefon.trim() || undefined,
      role: newMember.role,
    })

    if (result.success) {
      setShowAddMember(false)
      setNewMember({ jmeno: "", email: "", telefon: "", role: "zavodnik" })
      fetchData()
    } else {
      setError(result.error?.message || 'Nepodařilo se přidat člena')
    }
    setIsAddingMember(false)
  }

  const handleResendPozvanka = async (pozvankaId: string) => {
    setResendingId(pozvankaId)
    const result = await resendPozvanka(pozvankaId)
    if (result.success) {
      fetchData()
    } else {
      setError(result.error?.message || 'Nepodařilo se znovu odeslat pozvánku')
    }
    setResendingId(null)
  }

  const handleDeletePozvanka = async (pozvankaId: string) => {
    setDeletingPozvankaId(pozvankaId)
    const result = await deletePozvanka(pozvankaId)
    if (result.success) {
      setPozvanky(pozvanky.filter(p => p.id !== pozvankaId))
    } else {
      setError(result.error?.message || 'Nepodařilo se smazat pozvánku')
    }
    setDeletingPozvankaId(null)
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

  if (!tym) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Tým nenalezen</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href={`/admin/${zavodId}/tymy`}>
          <Button>Zpět na týmy</Button>
        </Link>
      </div>
    )
  }

  const registrovaniClenove = tym.clenove || []
  const neregistrovanePozvankyCelkem = pozvanky.filter(p => !p.pouzita).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/admin/${zavodId}/tymy`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0"
            style={{ backgroundColor: tym.barva }}
          >
            {tym.peg_cislo || '?'}
          </div>
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={editData.nazev}
                onChange={(e) => setEditData({ ...editData, nazev: e.target.value })}
                className="text-2xl font-bold h-auto py-1"
              />
            ) : (
              <h1 className="text-3xl font-bold">{tym.nazev}</h1>
            )}
            <div className="flex items-center gap-2 mt-1">
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
              {tym.peg_cislo && (
                <Badge variant="secondary">
                  <MapPin className="h-3 w-3 mr-1" />
                  Peg {tym.peg_cislo}
                </Badge>
              )}
            </div>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                <X className="h-4 w-4 mr-1" />
                Zrušit
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Uložit
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-1" />
              Upravit
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Edit panel */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Upravit tým</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Zaplaceno</Label>
                <p className="text-sm text-muted-foreground">Tým zaplatil startovné</p>
              </div>
              <Switch
                checked={editData.zaplaceno}
                onCheckedChange={(checked) => setEditData({ ...editData, zaplaceno: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Barva týmu</Label>
              <div className="grid grid-cols-10 gap-2">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setEditData({ ...editData, barva: color.hex })}
                    className={`
                      relative w-8 h-8 rounded transition-all
                      ${editData.barva === color.hex ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'}
                    `}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {editData.barva === color.hex && (
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Registrovaní členové */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registrovaní členové ({registrovaniClenove.length})
            </CardTitle>
            <CardDescription>
              Členové, kteří se již zaregistrovali
            </CardDescription>
          </CardHeader>
          <CardContent>
            {registrovaniClenove.length > 0 ? (
              <div className="space-y-3">
                {registrovaniClenove.map((clen) => (
                  <div key={clen.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{clen.user?.jmeno || 'Neznámé jméno'}</p>
                      <p className="text-sm text-muted-foreground">{clen.user?.email}</p>
                    </div>
                    <Badge variant={clen.role === 'kapitan' ? 'default' : 'secondary'}>
                      {clen.role === 'kapitan' ? 'Kapitán' : 'Závodník'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Zatím žádní registrovaní členové
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pozvánky */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pozvánky ({pozvanky.length})
              </CardTitle>
              <CardDescription>
                Odeslané pozvánky pro členy týmu
              </CardDescription>
            </div>
            <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Přidat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Přidat člena týmu</DialogTitle>
                  <DialogDescription>
                    Vyplňte údaje nového člena. Po vytvoření pozvánky zkopírujte odkaz a pošlete ho členovi.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="jmeno">Jméno *</Label>
                    <Input
                      id="jmeno"
                      placeholder="Jan Novák"
                      value={newMember.jmeno}
                      onChange={(e) => setNewMember({ ...newMember, jmeno: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jan@email.cz"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefon">Telefon</Label>
                    <Input
                      id="telefon"
                      type="tel"
                      placeholder="+420 123 456 789"
                      value={newMember.telefon}
                      onChange={(e) => setNewMember({ ...newMember, telefon: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newMember.role}
                      onValueChange={(value: "zavodnik" | "kapitan") => setNewMember({ ...newMember, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zavodnik">Závodník</SelectItem>
                        <SelectItem value="kapitan">Kapitán</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddMember(false)}>
                    Zrušit
                  </Button>
                  <Button onClick={handleAddMember} disabled={isAddingMember}>
                    {isAddingMember ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Vytvářím...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Vytvořit pozvánku
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {pozvanky.length > 0 ? (
              <div className="space-y-3">
                {pozvanky.map((pozvanka) => (
                  <div key={pozvanka.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      pozvanka.pouzita ? 'bg-green-500/10' : 'bg-blue-500/10'
                    }`}>
                      {pozvanka.pouzita ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{pozvanka.jmeno}</p>
                      <p className="text-sm text-muted-foreground truncate">{pozvanka.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pozvanka.pouzita ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Registrován
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyInviteLink(pozvanka.token, pozvanka.id)}
                            title="Zkopírovat odkaz"
                            className={copiedId === pozvanka.id ? 'text-green-600' : ''}
                          >
                            {copiedId === pozvanka.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResendPozvanka(pozvanka.id)}
                            disabled={resendingId === pozvanka.id}
                            title="Vygenerovat nový token"
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
                                disabled={deletingPozvankaId === pozvanka.id}
                              >
                                {deletingPozvankaId === pozvanka.id ? (
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
                                  onClick={() => handleDeletePozvanka(pozvanka.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Smazat
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">Zatím žádné pozvánky</p>
                <Button size="sm" onClick={() => setShowAddMember(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Přidat prvního člena
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Smazat tým */}
      {pozvanky.length === 0 && registrovaniClenove.length === 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Nebezpečná zóna</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Smazat tým
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Smazat tým?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tato akce je nevratná. Tým &quot;{tym.nazev}&quot; bude trvale smazán.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Mažu...' : 'Smazat'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
