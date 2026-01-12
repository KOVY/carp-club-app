"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Loader2, Users, Palette, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createTym } from "@/actions/tym.actions"
import { TEAM_COLORS } from "@/lib/types"

interface PageProps {
  params: Promise<{ zavodId: string }>
}

export default function NovyTymPage({ params }: PageProps) {
  const { zavodId } = use(params)
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nazev: "",
    barva: TEAM_COLORS[0].hex,
    zaplaceno: false,
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!formData.nazev.trim()) {
      setError("Název týmu je povinný")
      setIsSubmitting(false)
      return
    }

    const result = await createTym({
      zavodId,
      nazev: formData.nazev.trim(),
      barva: formData.barva,
      zaplaceno: formData.zaplaceno,
    })

    if (result.success && result.data) {
      router.push(`/admin/${zavodId}/tymy/${result.data.tymId}`)
    } else {
      setError(result.error?.message || "Nepodařilo se vytvořit tým")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/${zavodId}/tymy`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nový tým</h1>
          <p className="text-muted-foreground mt-1">
            Vytvořte nový tým pro závod
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
                <Users className="h-5 w-5" />
                Informace o týmu
              </CardTitle>
              <CardDescription>
                Název a platební stav
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nazev">Název týmu *</Label>
                <Input
                  id="nazev"
                  placeholder="např. Rybáři z Prahy"
                  value={formData.nazev}
                  onChange={(e) => handleChange("nazev", e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="zaplaceno">Zaplaceno</Label>
                  <p className="text-sm text-muted-foreground">
                    Tým zaplatil startovné
                  </p>
                </div>
                <Switch
                  id="zaplaceno"
                  checked={formData.zaplaceno}
                  onCheckedChange={(checked) => handleChange("zaplaceno", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Barva týmu */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Barva týmu
              </CardTitle>
              <CardDescription>
                Vyberte barvu pro vizuální rozlišení
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => handleChange("barva", color.hex)}
                    className={`
                      relative w-full aspect-square rounded-lg transition-all
                      ${formData.barva === color.hex ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}
                    `}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {formData.barva === color.hex && (
                      <Check className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground text-center">
                Vybraná barva: <span className="font-medium">{TEAM_COLORS.find(c => c.hex === formData.barva)?.name}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Náhled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: formData.barva }}
              >
                ?
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {formData.nazev || "Název týmu"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formData.zaplaceno ? "Zaplaceno" : "Nezaplaceno"} • Peg bude přiřazen později
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/admin/${zavodId}/tymy`}>
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
                Vytvořit tým
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
