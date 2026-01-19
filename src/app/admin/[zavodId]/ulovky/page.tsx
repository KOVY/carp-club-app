"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  Fish,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  MapPin,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { useToast } from "@/hooks/use-toast"
import {
  getZavodDetail,
  getPendingUlovkyAdmin,
  confirmUlovekAdmin,
  rejectUlovekAdmin,
} from "@/actions/hlavni-admin.actions"
import type { Zavod } from "@/lib/types"

interface PageProps {
  params: Promise<{ zavodId: string }>
}

interface UlovekData {
  id: string
  vaha: number
  druh: string
  stav: string
  cas: string
  foto_url: string | null
  tym: { id: string; nazev: string; peg_cislo: number | null } | null
  chytil: { id: string; jmeno: string } | null
  potvrzeni: Array<{
    id: string
    potvrdil_user_id: string
    potvrdil_tym_id: string | null
    potvrzeno: boolean
    poznamka: string | null
  }> | null
}

export default function AdminUlovkyPage({ params }: PageProps) {
  const { zavodId } = use(params)
  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [ulovky, setUlovky] = useState<UlovekData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "ceka" | "potvrzeno" | "zamitnuto">("all")
  const { toast } = useToast()

  const fetchData = async () => {
    const [zavodResult, ulovkyResult] = await Promise.all([
      getZavodDetail(zavodId),
      getPendingUlovkyAdmin(zavodId),
    ])

    if (zavodResult.success && zavodResult.data) {
      setZavod(zavodResult.data.zavod)
    }

    if (ulovkyResult.success && ulovkyResult.data) {
      setUlovky(ulovkyResult.data)
    } else {
      setError(ulovkyResult.error?.message || "Nepodařilo se načíst úlovky")
    }

    setIsLoading(false)
    setIsRefreshing(false)
  }

  useEffect(() => {
    fetchData()
  }, [zavodId])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchData()
  }

  const handleConfirm = async (ulovekId: string) => {
    const result = await confirmUlovekAdmin(ulovekId)
    if (result.success) {
      toast({
        title: "Úlovek potvrzen",
        description: "Úlovek byl úspěšně potvrzen",
      })
      fetchData()
    } else {
      toast({
        title: "Chyba",
        description: result.error?.message || "Nepodařilo se potvrdit úlovek",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (ulovekId: string, reason: string) => {
    const result = await rejectUlovekAdmin(ulovekId, reason)
    if (result.success) {
      toast({
        title: "Úlovek zamítnut",
        description: "Úlovek byl zamítnut",
      })
      fetchData()
    } else {
      toast({
        title: "Chyba",
        description: result.error?.message || "Nepodařilo se zamítnout úlovek",
        variant: "destructive",
      })
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "numeric",
    })
  }

  const getStatusBadge = (stav: string) => {
    switch (stav) {
      case "potvrzeno":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Potvrzeno
          </Badge>
        )
      case "zamitnuto":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Zamítnuto
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Čeká
          </Badge>
        )
    }
  }

  const filteredUlovky = ulovky.filter((u) => {
    if (filter === "all") return true
    return u.stav === filter
  })

  // Stats
  const stats = {
    total: ulovky.length,
    ceka: ulovky.filter((u) => u.stav === "ceka").length,
    potvrzeno: ulovky.filter((u) => u.stav === "potvrzeno").length,
    zamitnuto: ulovky.filter((u) => u.stav === "zamitnuto").length,
  }

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
            <h1 className="text-3xl font-bold">Správa úlovků</h1>
            {zavod && <p className="text-muted-foreground mt-1">{zavod.nazev}</p>}
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Obnovit
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-colors ${filter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setFilter("all")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Celkem</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${filter === "ceka" ? "ring-2 ring-yellow-500" : ""}`}
          onClick={() => setFilter("ceka")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.ceka}</p>
            <p className="text-sm text-muted-foreground">Čeká</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${filter === "potvrzeno" ? "ring-2 ring-green-500" : ""}`}
          onClick={() => setFilter("potvrzeno")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.potvrzeno}</p>
            <p className="text-sm text-muted-foreground">Potvrzeno</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${filter === "zamitnuto" ? "ring-2 ring-red-500" : ""}`}
          onClick={() => setFilter("zamitnuto")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.zamitnuto}</p>
            <p className="text-sm text-muted-foreground">Zamítnuto</p>
          </CardContent>
        </Card>
      </div>

      {/* Catches list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fish className="h-5 w-5" />
            Úlovky ({filteredUlovky.length})
          </CardTitle>
          <CardDescription>
            Klikněte na kartu statistiky pro filtrování podle stavu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUlovky.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Fish className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Žádné úlovky</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUlovky.map((ulovek) => (
                <UlovekCard
                  key={ulovek.id}
                  ulovek={ulovek}
                  onConfirm={handleConfirm}
                  onReject={handleReject}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface UlovekCardProps {
  ulovek: UlovekData
  onConfirm: (id: string) => Promise<void>
  onReject: (id: string, reason: string) => Promise<void>
  formatDate: (date: string) => string
  formatTime: (date: string) => string
  getStatusBadge: (stav: string) => React.ReactNode
}

function UlovekCard({
  ulovek,
  onConfirm,
  onReject,
  formatDate,
  formatTime,
  getStatusBadge,
}: UlovekCardProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const handleConfirm = async () => {
    setIsConfirming(true)
    await onConfirm(ulovek.id)
    setIsConfirming(false)
  }

  const handleReject = async () => {
    setIsRejecting(true)
    await onReject(ulovek.id, rejectReason)
    setIsRejecting(false)
    setRejectReason("")
  }

  return (
    <div className="border rounded-lg p-4 flex gap-4">
      {/* Photo */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        {ulovek.foto_url ? (
          <Image
            src={ulovek.foto_url}
            alt={`Úlovek ${ulovek.druh}`}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Fish className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              {ulovek.druh === "kapr" ? "Kapr" : "Amur"}
              <span className="text-xl">{ulovek.vaha} kg</span>
            </h4>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                {formatDate(ulovek.cas)} {formatTime(ulovek.cas)}
              </span>
              {ulovek.tym && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Peg {ulovek.tym.peg_cislo ?? "?"} • {ulovek.tym.nazev}
                </span>
              )}
            </div>
            {ulovek.chytil && (
              <p className="text-sm text-muted-foreground">Chytil: {ulovek.chytil.jmeno}</p>
            )}
          </div>
          {getStatusBadge(ulovek.stav)}
        </div>

        {/* Confirmation info */}
        {ulovek.potvrzeni && ulovek.potvrzeni.length > 0 && (
          <div className="text-xs text-muted-foreground mb-2">
            Potvrzení: {ulovek.potvrzeni.filter((p) => p.potvrzeno).length} /{" "}
            {ulovek.potvrzeni.length}
          </div>
        )}

        {/* Actions for pending catches */}
        {ulovek.stav === "ceka" && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isConfirming}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Potvrdit
                </>
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={isRejecting}>
                  {isRejecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Zamítnout
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Zamítnout úlovek?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Zadejte důvod zamítnutí (volitelné):
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  placeholder="Důvod zamítnutí..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReject}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Zamítnout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  )
}
