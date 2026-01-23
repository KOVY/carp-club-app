"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { 
  Settings, 
  Save, 
  Loader2, 
  Calendar,
  Clock,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle,
  Play,
  Square
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loading } from "@/components/common/Loading"
import { ErrorState } from "@/components/common/ErrorState"
import { MapSettings } from "@/components/admin"
import { updateZavod, setEmbargo, getTeamsByZavod } from "@/actions/admin.actions"
import { createClient } from "@/lib/supabase/client"
import type { Zavod, Tym, UserRole, StavZavodu } from "@/lib/types"

interface AdminNastaveniPageProps {
  params: Promise<{ zavodId: string }>
}

/**
 * Admin Settings Page
 * 
 * Requirements:
 * - 1.1: Create/edit competition with name, dates, rules, embargo time
 * - 6.1: Set embargo time
 */
export default function AdminNastaveniPage({ params }: AdminNastaveniPageProps) {
  const [zavodId, setZavodId] = useState<string | null>(null)
  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [tymy, setTymy] = useState<Tym[]>([])
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    nazev: "",
    misto: "",
    datum_start: "",
    datum_end: "",
    embargo_od: "",
    pravidla: "",
    stav: "priprava" as StavZavodu,
  })

  // Resolve params
  useEffect(() => {
    params.then(p => setZavodId(p.zavodId))
  }, [params])

  // Check user role and redirect if not authorized
  useEffect(() => {
    if (!zavodId) return

    const checkRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push(`/zavod/${zavodId}`)
        return
      }

      const { data: roleData } = await supabase
        .from('zavod_role')
        .select('role')
        .eq('user_id', user.id)
        .eq('zavod_id', zavodId)
        .single()

      const role = (roleData as { role: string } | null)?.role
      if (role !== 'poradatel') {
        toast({
          title: "Přístup odepřen",
          description: "Pouze pořadatel může upravovat nastavení závodu",
          variant: "destructive",
        })
        router.push(`/zavod/${zavodId}/admin`)
        return
      }

      setUserRole(role as UserRole)
    }

    checkRole()
  }, [zavodId, router, toast])

  // Fetch zavod data and teams
  const fetchZavod = useCallback(async () => {
    if (!zavodId || !userRole) return

    try {
      const supabase = createClient()

      // Fetch zavod data
      const { data, error: fetchError } = await supabase
        .from('zavody')
        .select('*')
        .eq('id', zavodId)
        .single()

      if (fetchError || !data) {
        setError("Nepodařilo se načíst data závodu")
        return
      }

      const zavodData = data as Zavod
      setZavod(zavodData)

      // Initialize form with current values
      setFormData({
        nazev: zavodData.nazev || "",
        misto: zavodData.misto || "",
        datum_start: formatDateTimeLocal(zavodData.datum_start),
        datum_end: formatDateTimeLocal(zavodData.datum_end),
        embargo_od: zavodData.embargo_od ? formatDateTimeLocal(zavodData.embargo_od) : "",
        pravidla: zavodData.pravidla || "",
        stav: zavodData.stav as StavZavodu,
      })

      // Fetch teams for map
      const teamsResult = await getTeamsByZavod(zavodId)
      if (teamsResult.success && teamsResult.data) {
        setTymy(teamsResult.data.tymy)
      }

      setError(null)
    } catch (err) {
      setError("Nepodařilo se načíst data")
    } finally {
      setIsLoading(false)
    }
  }, [zavodId, userRole])

  useEffect(() => {
    if (userRole) {
      fetchZavod()
    }
  }, [userRole, fetchZavod])

  // Format date for datetime-local input
  const formatDateTimeLocal = (dateString: string) => {
    const date = new Date(dateString)
    const offset = date.getTimezoneOffset()
    const localDate = new Date(date.getTime() - offset * 60 * 1000)
    return localDate.toISOString().slice(0, 16)
  }

  // Handle form input changes
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Handle save
  const handleSave = async () => {
    if (!zavodId) return

    setIsSaving(true)

    try {
      // Update zavod settings
      const result = await updateZavod(zavodId, {
        nazev: formData.nazev,
        misto: formData.misto || undefined,
        datum_start: new Date(formData.datum_start).toISOString(),
        datum_end: new Date(formData.datum_end).toISOString(),
        pravidla: formData.pravidla || undefined,
        stav: formData.stav,
      })

      if (!result.success) {
        toast({
          title: "Chyba",
          description: result.error?.message || "Nepodařilo se uložit nastavení",
          variant: "destructive",
        })
        return
      }

      // Update embargo separately if changed
      const newEmbargoOd = formData.embargo_od 
        ? new Date(formData.embargo_od).toISOString() 
        : null
      
      const currentEmbargoOd = zavod?.embargo_od || null
      
      if (newEmbargoOd !== currentEmbargoOd) {
        const embargoResult = await setEmbargo(zavodId, newEmbargoOd)
        
        if (!embargoResult.success) {
          toast({
            title: "Varování",
            description: "Nastavení bylo uloženo, ale embargo se nepodařilo aktualizovat",
            variant: "destructive",
          })
          return
        }
      }

      toast({
        title: "Uloženo",
        description: "Nastavení závodu bylo úspěšně aktualizováno",
      })

      // Refresh data
      fetchZavod()
    } catch (err) {
      toast({
        title: "Chyba",
        description: "Nastala neočekávaná chyba",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle status change
  const handleStatusChange = (newStatus: StavZavodu) => {
    setFormData(prev => ({ ...prev, stav: newStatus }))
  }

  // Clear embargo
  const handleClearEmbargo = () => {
    setFormData(prev => ({ ...prev, embargo_od: "" }))
  }

  if (!zavodId || !userRole) {
    return <Loading text="Načítání..." />
  }

  if (isLoading) {
    return <Loading text="Načítání nastavení..." />
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchZavod} />
  }

  const getStatusIcon = (status: StavZavodu) => {
    switch (status) {
      case 'priprava':
        return <Clock className="h-4 w-4" />
      case 'probiha':
        return <Play className="h-4 w-4" />
      case 'ukoncen':
        return <Square className="h-4 w-4" />
    }
  }

  const getStatusLabel = (status: StavZavodu) => {
    switch (status) {
      case 'priprava':
        return 'Příprava'
      case 'probiha':
        return 'Probíhá'
      case 'ukoncen':
        return 'Ukončen'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Nastavení závodu
          </h1>
          <p className="text-muted-foreground">
            Upravte základní informace a nastavení závodu
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Uložit změny
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Základní informace
            </CardTitle>
            <CardDescription>
              Název, místo a pravidla závodu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nazev">Název závodu *</Label>
              <Input
                id="nazev"
                value={formData.nazev}
                onChange={(e) => handleInputChange('nazev', e.target.value)}
                placeholder="Např. Jarní závod 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="misto" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Místo
              </Label>
              <Input
                id="misto"
                value={formData.misto}
                onChange={(e) => handleInputChange('misto', e.target.value)}
                placeholder="Např. Rybník Velký"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pravidla">Pravidla závodu</Label>
              <textarea
                id="pravidla"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.pravidla}
                onChange={(e) => handleInputChange('pravidla', e.target.value)}
                placeholder="Zadejte pravidla závodu..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Stav závodu
            </CardTitle>
            <CardDescription>
              Aktuální stav a průběh závodu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Aktuální stav</Label>
              <div className="flex gap-2">
                {(['priprava', 'probiha', 'ukoncen'] as StavZavodu[]).map((status) => (
                  <Button
                    key={status}
                    variant={formData.stav === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusChange(status)}
                    className="flex-1"
                  >
                    {getStatusIcon(status)}
                    <span className="ml-2">{getStatusLabel(status)}</span>
                  </Button>
                ))}
              </div>
            </div>

            {formData.stav === 'probiha' && (
              <div className="p-3 bg-green-500/10 rounded-md text-sm text-green-600">
                <CheckCircle className="h-4 w-4 inline mr-2" />
                Závod právě probíhá. Závodníci mohou zadávat úlovky.
              </div>
            )}

            {formData.stav === 'ukoncen' && (
              <div className="p-3 bg-amber-500/10 rounded-md text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Závod je ukončen. Zadávání úlovků je zablokováno.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Datum a čas
            </CardTitle>
            <CardDescription>
              Začátek a konec závodu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="datum_start">Začátek závodu *</Label>
              <Input
                id="datum_start"
                type="datetime-local"
                value={formData.datum_start}
                onChange={(e) => handleInputChange('datum_start', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="datum_end">Konec závodu *</Label>
              <Input
                id="datum_end"
                type="datetime-local"
                value={formData.datum_end}
                onChange={(e) => handleInputChange('datum_end', e.target.value)}
              />
            </div>

            {formData.datum_start && formData.datum_end && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <strong>Délka závodu:</strong>{" "}
                {(() => {
                  const start = new Date(formData.datum_start)
                  const end = new Date(formData.datum_end)
                  const diffMs = end.getTime() - start.getTime()
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                  const diffDays = Math.floor(diffHours / 24)
                  const remainingHours = diffHours % 24
                  
                  if (diffDays > 0) {
                    return `${diffDays} ${diffDays === 1 ? 'den' : diffDays < 5 ? 'dny' : 'dní'}${remainingHours > 0 ? ` a ${remainingHours} hodin` : ''}`
                  }
                  return `${diffHours} hodin`
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Embargo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Embargo
            </CardTitle>
            <CardDescription>
              Skrytí výsledků před koncem závodu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="embargo_od">Začátek embarga</Label>
              <div className="flex gap-2">
                <Input
                  id="embargo_od"
                  type="datetime-local"
                  value={formData.embargo_od}
                  onChange={(e) => handleInputChange('embargo_od', e.target.value)}
                  className="flex-1"
                />
                {formData.embargo_od && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClearEmbargo}
                    title="Zrušit embargo"
                  >
                    ×
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Od tohoto času budou váhy úlovků skryté pro závodníky a diváky
              </p>
            </div>

            {formData.embargo_od && (
              <div className="p-3 bg-amber-500/10 rounded-md text-sm text-amber-600">
                <Clock className="h-4 w-4 inline mr-2" />
                Embargo začne{" "}
                {new Date(formData.embargo_od).toLocaleString('cs-CZ', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}

            {!formData.embargo_od && (
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                Embargo není nastaveno. Výsledky budou viditelné po celou dobu závodu.
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> Embargo se obvykle nastavuje na poslední hodiny závodu,
                aby se zachovalo napětí před vyhlášením výsledků.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Settings */}
      {zavod && (
        <MapSettings
          zavod={zavod}
          tymy={tymy}
          onUpdate={fetchZavod}
        />
      )}

      {/* Save button at bottom for mobile */}
      <div className="md:hidden">
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Uložit změny
        </Button>
      </div>
    </div>
  )
}
