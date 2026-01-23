"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle,
  XCircle,
  Fish,
  RefreshCw,
  Loader2,
  Clock,
  ArrowLeft,
  Info
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"
import { DataDisplay } from "@/components/ui/DataDisplay"
import { StatusBadge } from "@/components/ui/StatusBadge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loading } from "@/components/common/Loading"
import { ErrorState } from "@/components/common/ErrorState"
import { getPendingPotvrzeni, potvrditUlovek } from "@/actions/potvrzeni.actions"
import { getUserRoleInZavod } from "@/actions/ulovky.actions"
import { createClient } from "@/lib/supabase/client"
import type { UlovekWithRelations, UserRole } from "@/lib/types"
import Link from "next/link"

interface PotvrzeniPageProps {
  params: Promise<{ zavodId: string }>
}

/**
 * Potvrzeni Page - Zjednodušená stránka pro kapitány/závodníky
 *
 * Umožňuje potvrzovat úlovky sousedních pegů (kapitáni)
 * Rozhodčí a pořadatelé jsou přesměrováni na /admin
 */
export default function PotvrzeniPage({ params }: PotvrzeniPageProps) {
  const [zavodId, setZavodId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userPeg, setUserPeg] = useState<number | null>(null)
  const [pendingUlovky, setPendingUlovky] = useState<UlovekWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

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
        router.push(`/login?returnTo=/zavod/${zavodId}/potvrzeni`)
        return
      }

      // Use server action to bypass RLS
      const roleResult = await getUserRoleInZavod(zavodId)

      if (!roleResult.success) {
        setUserRole('divak')
        return
      }

      const role = roleResult.data?.role as UserRole | null

      // Rozhodčí a pořadatelé mají přístup na /admin
      if (role && ['rozhodci', 'poradatel'].includes(role)) {
        router.push(`/zavod/${zavodId}/admin`)
        return
      }

      // Set user role and peg from server action result
      if (role) {
        setUserRole(role)
      } else {
        setUserRole('divak')
      }

      // Get user's peg number if they're in a team
      if (roleResult.data?.tymId) {
        const { data: teamData } = await supabase
          .from('tymy')
          .select('peg_cislo')
          .eq('id', roleResult.data.tymId)
          .single()

        if (teamData) {
          setUserPeg((teamData as { peg_cislo: number | null }).peg_cislo)
        }
      }
    }

    checkRole()
  }, [zavodId, router])

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!zavodId) return

    try {
      setIsRefreshing(true)

      // Fetch pending catches that user can confirm
      const pendingResult = await getPendingPotvrzeni(zavodId)
      if (pendingResult.success && pendingResult.data) {
        setPendingUlovky(pendingResult.data.ulovky)
      } else {
        setPendingUlovky([])
      }

      setError(null)
    } catch (err) {
      setError("Nepodařilo se načíst data")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [zavodId])

  useEffect(() => {
    if (userRole && userRole !== 'divak') {
      fetchData()
    } else if (userRole === 'divak') {
      setIsLoading(false)
    }
  }, [userRole, fetchData])

  // Handle catch confirmation
  const handleConfirm = async (ulovekId: string, potvrzeno: boolean) => {
    setConfirmingId(ulovekId)

    try {
      const result = await potvrditUlovek({
        ulovekId,
        potvrzeno,
      })

      if (result.success) {
        toast({
          title: potvrzeno ? "Úlovek potvrzen" : "Úlovek zamítnut",
          description: potvrzeno
            ? "Úlovek byl úspěšně potvrzen"
            : "Úlovek byl zamítnut",
        })
        // Refresh data
        fetchData()
      } else {
        toast({
          title: "Chyba",
          description: result.error?.message || "Nepodařilo se zpracovat potvrzení",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Chyba",
        description: "Nastala neočekávaná chyba",
        variant: "destructive",
      })
    } finally {
      setConfirmingId(null)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!zavodId) {
    return <Loading text="Načítání..." />
  }

  if (isLoading) {
    return <Loading text="Načítání dat..." />
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />
  }

  // Info pro diváky nebo nepřihlášené
  if (userRole === 'divak' || !userRole) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/zavod/${zavodId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Potvrzování úlovků</h1>
        </div>

        <GlassCard>
          <GlassCardContent className="py-12">
            <div className="text-center">
              <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Přístup pouze pro členy týmů</h2>
              <p className="text-muted-foreground mb-4">
                Potvrzování úlovků mohou provádět pouze kapitáni týmů pro sousední pegy.
              </p>
              <Link href={`/login?returnTo=/zavod/${zavodId}/potvrzeni`}>
                <Button>Přihlásit se</Button>
              </Link>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    )
  }

  // Info pro závodníky (ne-kapitány)
  if (userRole === 'zavodnik') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/zavod/${zavodId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Potvrzování úlovků</h1>
        </div>

        <GlassCard>
          <GlassCardContent className="py-12">
            <div className="text-center">
              <Info className="h-12 w-12 mx-auto mb-4 text-amber-500" />
              <h2 className="text-xl font-semibold mb-2">Pouze pro kapitány</h2>
              <p className="text-muted-foreground">
                Potvrzování úlovků mohou provádět pouze kapitáni týmů.
                Kontaktujte svého kapitána nebo rozhodčího.
              </p>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/zavod/${zavodId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Potvrzování úlovků</h1>
            <p className="text-muted-foreground">
              {userPeg !== null
                ? `Potvrzujete úlovky z pegů ${userPeg - 1} a ${userPeg + 1}`
                : 'Sousední pegy'
              }
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">Obnovit</span>
        </Button>
      </div>

      {/* Stats Card */}
      <GlassCard>
        <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <GlassCardTitle className="text-sm font-medium">Čekající na vaše potvrzení</GlassCardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </GlassCardHeader>
        <GlassCardContent>
          <DataDisplay value={pendingUlovky.length} size="lg" status={pendingUlovky.length > 0 ? "pending" : undefined} />
          <p className="text-xs text-muted-foreground mt-1">
            Úlovků ze sousedních pegů
          </p>
        </GlassCardContent>
      </GlassCard>

      {/* Pending Catches */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Fish className="h-5 w-5" />
            Úlovky k potvrzení
          </GlassCardTitle>
          <GlassCardDescription>
            Jako kapitán můžete potvrdit úlovky sousedních pegů (±1)
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          {pendingUlovky.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium">Vše potvrzeno</p>
              <p className="text-sm">Žádné úlovky ze sousedních pegů nečekají na vaše potvrzení</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {pendingUlovky.map((ulovek) => (
                  <div key={ulovek.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{ulovek.tym?.nazev || 'Neznámý'}</p>
                        <p className="text-sm text-muted-foreground">
                          Peg {ulovek.tym?.peg_cislo || '-'}
                        </p>
                      </div>
                      <StatusBadge status="pending" size="sm">
                        {ulovek.potvrzeni?.filter(p => p.potvrzeno).length || 0} / 2
                      </StatusBadge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <DataDisplay value={`${ulovek.vaha} kg`} size="lg" />
                        <p className="text-xs text-muted-foreground capitalize">{ulovek.druh}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(ulovek.cas)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-green-600 hover:text-green-700"
                        onClick={() => handleConfirm(ulovek.id, true)}
                        disabled={confirmingId === ulovek.id}
                      >
                        {confirmingId === ulovek.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span className="ml-2">Potvrdit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-600 hover:text-red-700"
                        onClick={() => handleConfirm(ulovek.id, false)}
                        disabled={confirmingId === ulovek.id}
                      >
                        {confirmingId === ulovek.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span className="ml-2">Zamítnout</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tým</TableHead>
                      <TableHead>Peg</TableHead>
                      <TableHead>Váha</TableHead>
                      <TableHead>Druh</TableHead>
                      <TableHead>Čas</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead className="text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUlovky.map((ulovek) => (
                      <TableRow key={ulovek.id}>
                        <TableCell className="font-medium">
                          {ulovek.tym?.nazev || 'Neznámý'}
                        </TableCell>
                        <TableCell>
                          {ulovek.tym?.peg_cislo || '-'}
                        </TableCell>
                        <TableCell>
                          <DataDisplay value={`${ulovek.vaha} kg`} size="sm" />
                        </TableCell>
                        <TableCell className="capitalize">{ulovek.druh}</TableCell>
                        <TableCell>{formatDate(ulovek.cas)}</TableCell>
                        <TableCell>
                          <StatusBadge status="pending" size="sm">
                            {ulovek.potvrzeni?.filter(p => p.potvrzeno).length || 0} / 2
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleConfirm(ulovek.id, true)}
                              disabled={confirmingId === ulovek.id}
                            >
                              {confirmingId === ulovek.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              <span className="ml-1">Potvrdit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleConfirm(ulovek.id, false)}
                              disabled={confirmingId === ulovek.id}
                            >
                              {confirmingId === ulovek.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              <span className="ml-1">Zamítnout</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
