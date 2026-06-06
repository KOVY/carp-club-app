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
import { getTymDetail, updateTym, deleteTym, pridatClenaDoTymu, odebratClenaZTymu } from "@/actions/tym.actions"
import { hledatUzivatele, type RozhodciUzivatel } from "@/actions/rozhodci.actions"
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
  const [editData, setEditData] = useState({ nazev: "", barva: "", zaplaceno: false, peg_cislo: null as number | null })
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

  // Přidat REGISTROVANÉHO člena do týmu (bez e-mailu, vyhledáním)
  const [showAddClen, setShowAddClen] = useState(false)
  const [clenQuery, setClenQuery] = useState("")
  const [clenVysledky, setClenVysledky] = useState<RozhodciUzivatel[]>([])
  const [clenSearching, setClenSearching] = useState(false)
  const [clenRole, setClenRole] = useState<"zavodnik" | "kapitan">("zavodnik")
  const [addingClenId, setAddingClenId] = useState<string | null>(null)
  const [removingClenId, setRemovingClenId] = useState<string | null>(null)

  const handleAddClen = async (uid: string) => {
    setAddingClenId(uid)
    setError(null)
    const r = await pridatClenaDoTymu(tymId, uid, clenRole)
    if (r.success) {
      setShowAddClen(false)
      setClenQuery("")
      setClenVysledky([])
      setClenRole("zavodnik")
      fetchData()
    } else {
      setError(r.error?.message || "Nepodařilo se přidat člena")
    }
    setAddingClenId(null)
  }

  const handleRemoveClen = async (uid: string) => {
    setRemovingClenId(uid)
    const r = await odebratClenaZTymu(tymId, uid)
    if (r.success) {
      fetchData()
    } else {
      setError(r.error?.message || "Nepodařilo se odebrat člena")
    }
    setRemovingClenId(null)
  }

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
        peg_cislo: tymResult.data.peg_cislo ?? null,
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

  // Debounce vyhledávání registrovaných uživatelů pro přidání do týmu
  useEffect(() => {
    if (!showAddClen) return
    const q = clenQuery.trim()
    if (q.length < 2) { setClenVysledky([]); return }
    setClenSearching(true)
    const t = setTimeout(async () => {
      const r = await hledatUzivatele(zavodId, q)
      setClenVysledky(r.success ? r.data ?? [] : [])
      setClenSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [clenQuery, showAddClen, zavodId])

  const handleSaveEdit = async () => {
    setIsSaving(true)
    setError(null)

    const result = await updateTym(tymId, {
      nazev: editData.nazev,
      barva: editData.barva,
      zaplaceno: editData.zaplaceno,
      peg_cislo: editData.peg_cislo,
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
    console.log('handleAddMember called with:', newMember)

    if (!newMember.jmeno.trim() || !newMember.email.trim()) {
      setError('Jméno a email jsou povinné')
      return
    }

    setIsAddingMember(true)
    setError(null)

    try {
      console.log('Calling createPozvanka with:', {
        zavodId,
        tymId,
        jmeno: newMember.jmeno.trim(),
        email: newMember.email.trim(),
        telefon: newMember.telefon.trim() || undefined,
        role: newMember.role,
      })

      const result = await createPozvanka({
        zavodId,
        tymId,
        jmeno: newMember.jmeno.trim(),
        email: newMember.email.trim(),
        telefon: newMember.telefon.trim() || undefined,
        role: newMember.role,
      })

      console.log('createPozvanka result:', result)

      if (result.success) {
        setShowAddMember(false)
        setNewMember({ jmeno: "", email: "", telefon: "", role: "zavodnik" })
        fetchData()
      } else {
        const errorMsg = result.error?.message || 'Nepodařilo se přidat člena'
        console.error('createPozvanka error:', result.error)
        setError(errorMsg)
      }
    } catch (err) {
      console.error('handleAddMember exception:', err)
      setError(`Neočekávaná chyba: ${err instanceof Error ? err.message : 'Unknown'}`)
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
            <div className="space-y-2">
              <Label htmlFor="peg_cislo">Číslo pegu</Label>
              <Input
                id="peg_cislo"
                type="number"
                min="1"
                placeholder="např. 1, 2, 3..."
                value={editData.peg_cislo ?? ""}
                onChange={(e) => setEditData({
                  ...editData,
                  peg_cislo: e.target.value ? parseInt(e.target.value, 10) : null
                })}
                className="max-w-32"
              />
              <p className="text-sm text-muted-foreground">Pozice týmu na břehu (musí být unikátní)</p>
            </div>

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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={removingClenId === clen.user_id}
                        >
                          {removingClenId === clen.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Odebrat člena?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {clen.user?.jmeno || 'Člen'} bude odebrán z týmu. Účet uživatele zůstane.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Zrušit</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveClen(clen.user_id)}
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
              <p className="text-muted-foreground text-center py-4">
                Zatím žádní registrovaní členové
              </p>
            )}
          </CardContent>
        </Card>

        {/* Přidat REGISTROVANÉHO člena do týmu (bez e-mailu, vyhledáním) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Přidat člena
              </CardTitle>
              <CardDescription>
                Přiřaďte registrovaného závodníka do týmu (bez e-mailu).
              </CardDescription>
            </div>
            <Dialog open={showAddClen} onOpenChange={setShowAddClen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Přidat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Přidat člena do týmu</DialogTitle>
                  <DialogDescription>
                    Najděte registrovaného uživatele podle jména nebo e-mailu. Uživatel se musí
                    nejdřív sám zaregistrovat (e-mail+heslo nebo Google).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Role v týmu</Label>
                    <Select value={clenRole} onValueChange={(v: "zavodnik" | "kapitan") => setClenRole(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zavodnik">Závodník</SelectItem>
                        <SelectItem value="kapitan">Kapitán</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clen-search">Jméno nebo e-mail</Label>
                    <Input
                      id="clen-search"
                      placeholder="např. Novák / novak@email.cz"
                      value={clenQuery}
                      onChange={(e) => setClenQuery(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="min-h-[120px]">
                    {clenSearching ? (
                      <div className="flex items-center justify-center py-6 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Hledám…
                      </div>
                    ) : clenQuery.trim().length < 2 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Zadejte alespoň 2 znaky pro vyhledávání.
                      </p>
                    ) : clenVysledky.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Nikdo nenalezen. Uživatel se musí nejdřív zaregistrovat.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {clenVysledky.map((u) => (
                          <div key={u.userId} className="flex items-center gap-3 p-2 rounded-lg border">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{u.jmeno}</p>
                              <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                            </div>
                            <Button size="sm" disabled={addingClenId === u.userId} onClick={() => handleAddClen(u.userId)}>
                              {addingClenId === u.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Přidat"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tip: kapitán při přihlášce na závod uvádí spoluhráče jen jako jména. Tady přidáte ty,
              kdo mají vlastní účet a budou sami zadávat úlovky.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Smazat tým */}
      {registrovaniClenove.length === 0 && (
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
