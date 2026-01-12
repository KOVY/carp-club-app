"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, MapPin, FileText, Save, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createZavodAsAdmin, getSouteze } from "@/actions/hlavni-admin.actions"

interface Soutez {
  id: string
  nazev: string
  rok: number
}

export default function NovyZavodPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [souteze, setSouteze] = useState<Soutez[]>([])

  const [formData, setFormData] = useState({
    nazev: "",
    misto: "",
    datum_start: "",
    datum_end: "",
    embargo_od: "",
    pravidla: "",
    soutez_id: "",
  })

  useEffect(() => {
    const fetchSouteze = async () => {
      const result = await getSouteze()
      if (result.success && result.data) {
        setSouteze(result.data)
      }
    }
    fetchSouteze()
  }, [])

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

    const result = await createZavodAsAdmin({
      nazev: formData.nazev.trim(),
      misto: formData.misto.trim() || undefined,
      datum_start: formData.datum_start,
      datum_end: formData.datum_end,
      embargo_od: formData.embargo_od || undefined,
      pravidla: formData.pravidla.trim() || undefined,
      soutez_id: formData.soutez_id || undefined,
    })

    if (result.success && result.data) {
      router.push(`/admin/${result.data.zavodId}`)
    } else {
      setError(result.error?.message || "Nepodařilo se vytvořit závod")
      setIsSubmitting(false)
    }
  }

  // Vypočti výchozí hodnoty pro datumy
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/zavody">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nový závod</h1>
          <p className="text-muted-foreground mt-1">
            Vytvořte nový závod pro sezónu
          </p>
        </div>
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

              {souteze.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="soutez">Soutěž (volitelné)</Label>
                  <Select
                    value={formData.soutez_id}
                    onValueChange={(value) => handleChange("soutez_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte soutěž" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Bez soutěže</SelectItem>
                      {souteze.map((soutez) => (
                        <SelectItem key={soutez.id} value={soutez.id}>
                          {soutez.nazev} ({soutez.rok})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                    min={today}
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
                    min={formData.datum_start || today}
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
                  min={formData.datum_start}
                  max={formData.datum_end}
                />
                <p className="text-xs text-muted-foreground">
                  Od tohoto času se skryje leaderboard před účastníky
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
          <Link href="/admin/zavody">
            <Button type="button" variant="outline">
              Zrušit
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Vytvářím...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Vytvořit závod
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
