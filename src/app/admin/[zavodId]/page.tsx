"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Trophy,
  Fish,
  AlertTriangle,
  Settings,
  Play,
  Square,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Mail,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import type { Zavod, ZavodStats } from "@/lib/types"

interface PageProps {
  params: Promise<{ zavodId: string }>
}

export default function ZavodDetailPage({ params }: PageProps) {
  const { zavodId } = use(params)
  const router = useRouter()
  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [stats, setStats] = useState<ZavodStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const result = await getZavodDetail(zavodId)
      if (result.success && result.data) {
        setZavod(result.data.zavod)
        setStats(result.data.stats)
      } else {
        setError(result.error?.message || 'Nepodařilo se načíst závod')
      }
      setIsLoading(false)
    }

    fetchData()
  }, [zavodId])

  const handleChangeStav = async (newStav: 'priprava' | 'probiha' | 'ukoncen') => {
    if (!zavod) return
    setIsUpdating(true)

    const result = await updateZavodAsAdmin(zavodId, { stav: newStav })
    if (result.success && result.data) {
      setZavod(result.data)
    } else {
      setError(result.error?.message || 'Nepodařilo se změnit stav')
    }
    setIsUpdating(false)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)

    if (startDate.toDateString() === endDate.toDateString()) {
      return `${formatDate(start)} - ${endDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`
    }

    return `${formatDate(start)} - ${formatDate(end)}`
  }

  const getStavBadge = (stav: string) => {
    switch (stav) {
      case 'priprava':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-500/10 text-blue-600">
            <Clock className="h-4 w-4" />
            Příprava
          </span>
        )
      case 'probiha':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-green-500/10 text-green-600">
            <CheckCircle className="h-4 w-4" />
            Probíhá
          </span>
        )
      case 'ukoncen':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-500/10 text-gray-600">
            <Square className="h-4 w-4" />
            Ukončen
          </span>
        )
      default:
        return null
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{zavod.nazev}</h1>
              {getStavBadge(zavod.stav)}
            </div>
            {zavod.misto && (
              <p className="text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {zavod.misto}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {zavod.stav === 'priprava' && (
            <Button
              onClick={() => handleChangeStav('probiha')}
              disabled={isUpdating}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Zahájit závod
            </Button>
          )}
          {zavod.stav === 'probiha' && (
            <Button
              onClick={() => handleChangeStav('ukoncen')}
              disabled={isUpdating}
              variant="destructive"
              className="gap-2"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              Ukončit závod
            </Button>
          )}
          <Link href={`/admin/${zavodId}/edit`}>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Upravit
            </Button>
          </Link>
          {zavod.stav === 'priprava' && stats?.pocet_tymu === 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Smazat
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Smazat závod?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tato akce je nevratná. Závod &quot;{zavod.nazev}&quot; bude trvale smazán.
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
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Týmy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pocet_tymu || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pocet_clenu || 0} členů celkem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pozvánky</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pocet_pozvanek || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pocet_registrovanych || 0} registrovaných
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Úlovky</CardTitle>
            <Fish className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pocet_ulovku || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pocet_potvrzenych || 0} potvrzených
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Žluté karty</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pocet_zlutych_karet || 0}</div>
            <p className="text-xs text-muted-foreground">
              udělených
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info a rychlé akce */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informace o závodě
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Termín</p>
              <p className="font-medium">{formatDateRange(zavod.datum_start, zavod.datum_end)}</p>
            </div>
            {zavod.embargo_od && (
              <div>
                <p className="text-sm text-muted-foreground">Embargo od</p>
                <p className="font-medium">{formatDate(zavod.embargo_od)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Minimální váha ryby</p>
              <p className="font-medium">{zavod.min_vaha_kg} kg</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top ryby pro skóre</p>
              <p className="font-medium">{zavod.top_n_ryb} nejlepších</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Potřeba potvrzení</p>
              <p className="font-medium">{zavod.pocet_potvrzeni}x</p>
            </div>
          </CardContent>
        </Card>

        {/* Rychlé akce */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Správa závodu
            </CardTitle>
            <CardDescription>
              Rychlé odkazy na správu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href={`/admin/${zavodId}/tymy`} className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Správa týmů
                <span className="ml-auto text-muted-foreground">{stats?.pocet_tymu || 0}</span>
              </Button>
            </Link>
            <Link href={`/admin/${zavodId}/rozhodci`} className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Trophy className="h-4 w-4" />
                Správa rozhodčích
              </Button>
            </Link>
            {zavod.stav !== 'priprava' && (
              <Link href={`/zavod/${zavodId}/admin`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Fish className="h-4 w-4" />
                  Živý přehled závodu
                </Button>
              </Link>
            )}
            {zavod.stav !== 'priprava' && (
              <Link href={`/zavod/${zavodId}`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Trophy className="h-4 w-4" />
                  Veřejný leaderboard
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pravidla */}
      {zavod.pravidla && (
        <Card>
          <CardHeader>
            <CardTitle>Pravidla závodu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <pre className="whitespace-pre-wrap font-sans">{zavod.pravidla}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
