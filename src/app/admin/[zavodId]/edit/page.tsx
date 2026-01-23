"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, MapPin, FileText, Save, Loader2, Trash2, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { getZavodDetail, updateZavodAsAdmin, deleteZavod } from "@/actions/hlavni-admin.actions"
import type { Zavod } from "@/lib/types"

interface PageProps {
  params: Promise<{ zavodId: string }>
}

export default function EditZavodPage({ params }: PageProps) {
  const { zavodId } = use(params)
  const router = useRouter()
  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nazev: "",
    misto: "",
    datum_start: "",
    datum_end: "",
    embargo_od: "",
    pravidla: "",
    min_vaha_kg: "5",
    top_n_ryb: "7",
    pocet_potvrzeni: "2",
  })

  useEffect(() => {
    const fetchData = async () => {
      const result = await getZavodDetail(zavodId)
      if (result.success && result.data) {
        const z = result.data.zavod
        setZavod(z)
        setFormData({
          nazev: z.nazev || "",
          misto: z.misto || "",
          datum_start: z.datum_start ? formatDateTimeLocal(z.datum_start) : "",
          datum_end: z.datum_end ? formatDateTimeLocal(z.datum_end) : "",
          embargo_od: z.embargo_od ? formatDateTimeLocal(z.embargo_od) : "",
          pravidla: z.pravidla || "",
          min_vaha_kg: String(z.min_vaha_kg || 5),
          top_n_ryb: String(z.top_n_ryb || 7),
          pocet_potvrzeni: String(z.pocet_potvrzeni || 2),
        })
      } else {
        setError(result.error?.message || 'Nepodařilo se načíst závod')
      }
      setIsLoading(false)
    }

    fetchData()
  }, [zavodId])

  const formatDateTimeLocal = (dateString: string) => {
    const date = new Date(dateString)
    return date.toISOString().slice(0, 16)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validace
    if (!formData.nazev.trim()) {
      setError("Název závodu je povinný")
      setIsSubmitting(false)
      return
    }

    if (!formData.datum_start || !formData.datum_end) {
      setError("Datum začátku a konce je povinné")
      setIsSubmitting(false)
      return
    }

    const startDate = new Date(formData.datum_start)
    const endDate = new Date(formData.datum_end)

    if (endDate <= startDate) {
      setError("Datum konce musí být po datu začátku")
      setIsSubmitting(false)
      return
    }

    const result = await updateZavodAsAdmin(zavodId, {
      nazev: formData.nazev.trim(),
      misto: formData.misto.trim() || undefined,
      datum_start: formData.datum_start,
      datum_end: formData.datum_end,
      embargo_od: formData.embargo_od || null,
      pravidla: formData.pravidla.trim() || undefined,
      min_vaha_kg: parseFloat(formData.min_vaha_kg) || 5,
      top_n_ryb: parseInt(formData.top_n_ryb) || 7,
      pocet_potvrzeni: parseInt(formData.pocet_potvrzeni) || 2,
    })

    if (result.success) {
      router.push(`/admin/${zavodId}`)
    } else {
      setError(result.error?.message || "Nepodařilo se uložit změny")
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteZavod(zavodId)
    if (result.success) {
      router.push('/admin')
    } else {
      setError(result.error?.message || 'Nepodařilo se smazat závod')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!zavod) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Závod nenalezen</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/admin">
          <Button>Zpět na dashboard</Button>
        </Link>
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
          <h1 className="text-3xl font-bold">Upravit závod</h1>
          <p className="text-muted-foreground mt-1">
            {zavod.nazev}
          </p>
        </div>

        {/* Delete button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Smazat závod
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Opravdu smazat závod?</AlertDialogTitle>
              <AlertDialogDescription>
                Tato akce je nevratná. Závod &quot;{zavod.nazev}&quot; bude trvale smazán včetně všech týmů, úlovků a dalších dat.
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
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Základní informace */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Základní informace
              </CardTitle>
              <CardDescription>
                Název a místo konání závodu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nazev">Název závodu *</Label>
                <Input
                  id="nazev"
                  placeholder="např. Jarní pohár 2024"
                  value={formData.nazev}
                  onChange={(e) => handleChange("nazev", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="misto">Místo konání</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="misto"
                    placeholder="např. Rybník Jordán, Tábor"
                    value={formData.misto}
                    onChange={(e) => handleChange("misto", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datum a čas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Datum a čas
              </CardTitle>
              <CardDescription>
                Nastavte termín závodu a embargo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="datum_start">Začátek *</Label>
                  <Input
                    id="datum_start"
                    type="datetime-local"
                    value={formData.datum_start}
                    onChange={(e) => handleChange("datum_start", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="datum_end">Konec *</Label>
                  <Input
                    id="datum_end"
                    type="datetime-local"
                    value={formData.datum_end}
                    onChange={(e) => handleChange("datum_end", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="embargo_od">Embargo od (volitelné)</Label>
                <Input
                  id="embargo_od"
                  type="datetime-local"
                  value={formData.embargo_od}
                  onChange={(e) => handleChange("embargo_od", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Od tohoto času se skryje leaderboard před účastníky
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Parametry závodu */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Parametry závodu
              </CardTitle>
              <CardDescription>
                Nastavení pravidel pro úlovky a bodování
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="min_vaha_kg">Minimální váha ryby (kg)</Label>
                <Input
                  id="min_vaha_kg"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.min_vaha_kg}
                  onChange={(e) => handleChange("min_vaha_kg", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ryby pod touto váhou nebudou započítány
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="top_n_ryb">Počet ryb do skóre</Label>
                <Input
                  id="top_n_ryb"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.top_n_ryb}
                  onChange={(e) => handleChange("top_n_ryb", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Počet nejlepších ryb započítaných do celkového skóre
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pocet_potvrzeni">Počet potřebných potvrzení</Label>
                <Input
                  id="pocet_potvrzeni"
                  type="number"
                  min="1"
                  max="4"
                  value={formData.pocet_potvrzeni}
                  onChange={(e) => handleChange("pocet_potvrzeni", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Kolik potvrzení od sousedních peg je třeba pro uznání úlovku
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pravidla - celá šířka */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Pravidla závodu</CardTitle>
              <CardDescription>
                Pravidla a informace pro závodníky (volitelné)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Zadejte pravidla závodu..."
                value={formData.pravidla}
                onChange={(e) => handleChange("pravidla", e.target.value)}
                rows={6}
              />
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/admin/${zavodId}`}>
            <Button type="button" variant="outline">
              Zrušit
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Ukládám...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Uložit změny
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
