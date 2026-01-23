"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Fish, 
  Users,
  RefreshCw,
  Loader2,
  Clock,
  Download
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"
import { DataDisplay } from "@/components/ui/DataDisplay"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SkeletonLoader } from "@/components/ui/SkeletonLoader"
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
import { ZlutaKartaDialog, YellowCardBadge } from "@/components/zavod/ZlutaKartaDialog"
import { getPendingPotvrzeni } from "@/actions/potvrzeni.actions"
import { potvrditUlovek } from "@/actions/potvrzeni.actions"
import { getTeamsByZavod, getZluteKartyByTym } from "@/actions/admin.actions"
import { getUserRoleInZavod } from "@/actions/ulovky.actions"
import { createClient } from "@/lib/supabase/client"
import type { UlovekWithRelations, Tym, TymWithRelations, UserRole } from "@/lib/types"

interface AdminPageProps {
  params: Promise<{ zavodId: string }>
}

interface TeamWithYellowCards extends Tym {
  yellowCardCount: number
}

/**
 * Admin/Rozhodčí Dashboard Page
 * 
 * Requirements:
 * - 8.5: rozhodci can confirm all catches and issue yellow cards
 * - 8.6: poradatel has full access
 */
export default function AdminPage({ params }: AdminPageProps) {
  const [zavodId, setZavodId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [pendingUlovky, setPendingUlovky] = useState<UlovekWithRelations[]>([])
  const [teams, setTeams] = useState<TeamWithYellowCards[]>([])
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
        router.push(`/zavod/${zavodId}`)
        return
      }

      // Use server action to bypass RLS
      const roleResult = await getUserRoleInZavod(zavodId)

      if (!roleResult.success || !roleResult.data?.role) {
        toast({
          title: "Přístup odepřen",
          description: "Nemáte oprávnění pro přístup k této stránce",
          variant: "destructive",
        })
        router.push(`/zavod/${zavodId}`)
        return
      }

      const role = roleResult.data.role
      if (!['rozhodci', 'poradatel'].includes(role)) {
        toast({
          title: "Přístup odepřen",
          description: "Nemáte oprávnění pro přístup k této stránce",
          variant: "destructive",
        })
        router.push(`/zavod/${zavodId}`)
        return
      }

      setUserRole(role as UserRole)
    }

    checkRole()
  }, [zavodId, router, toast])

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!zavodId || !userRole) return

    try {
      setIsRefreshing(true)

      // Fetch pending catches
      const pendingResult = await getPendingPotvrzeni(zavodId)
      if (pendingResult.success && pendingResult.data) {
        setPendingUlovky(pendingResult.data.ulovky)
      }

      // Fetch teams
      const teamsResult = await getTeamsByZavod(zavodId)
      if (teamsResult.success && teamsResult.data) {
        // Fetch yellow cards for each team
        const teamsWithCards: TeamWithYellowCards[] = await Promise.all(
          teamsResult.data.tymy.map(async (tym) => {
            const cardsResult = await getZluteKartyByTym(tym.id, zavodId)
            return {
              ...tym,
              yellowCardCount: cardsResult.success ? cardsResult.data?.zluteKarty.length || 0 : 0,
            } as TeamWithYellowCards
          })
        )
        setTeams(teamsWithCards)
      }

      setError(null)
    } catch (err) {
      setError("Nepodařilo se načíst data")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [zavodId, userRole])

  useEffect(() => {
    if (userRole) {
      fetchData()
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

  if (!zavodId || !userRole) {
    return <Loading text="Načítání..." />
  }

  if (isLoading) {
    return <Loading text="Načítání dat..." />
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {userRole === 'poradatel' ? 'Administrace' : 'Rozhodčí panel'}
          </h1>
          <p className="text-muted-foreground">
            Správa úlovků a týmů
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            <span className="ml-2">Obnovit</span>
          </Button>
          {/* Export HTML - pouze pro pořadatele */}
          {userRole === 'poradatel' && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={`/api/export/${zavodId}`} download>
                <Download className="h-4 w-4" />
                <span className="ml-2">Export HTML</span>
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Čekající úlovky</GlassCardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </GlassCardHeader>
          <GlassCardContent>
            <DataDisplay value={pendingUlovky.length} size="lg" status={pendingUlovky.length > 0 ? "pending" : undefined} />
            <p className="text-xs text-muted-foreground mt-1">
              K potvrzení
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Týmy</GlassCardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </GlassCardHeader>
          <GlassCardContent>
            <DataDisplay value={teams.length} size="lg" />
            <p className="text-xs text-muted-foreground mt-1">
              V závodě
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Žluté karty</GlassCardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </GlassCardHeader>
          <GlassCardContent>
            <DataDisplay 
              value={teams.reduce((sum, t) => sum + t.yellowCardCount, 0)} 
              size="lg" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              Celkem uděleno
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Pending Catches */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Fish className="h-5 w-5" />
            Úlovky čekající na potvrzení
          </GlassCardTitle>
          <GlassCardDescription>
            Jako rozhodčí můžete potvrdit nebo zamítnout jakýkoliv úlovek
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          {pendingUlovky.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>Žádné úlovky nečekají na potvrzení</p>
            </div>
          ) : (
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
                          <span className="ml-1 hidden sm:inline">Potvrdit</span>
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
                          <span className="ml-1 hidden sm:inline">Zamítnout</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Teams Overview */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Přehled týmů
          </GlassCardTitle>
          <GlassCardDescription>
            Seznam týmů s možností udělení žluté karty
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          {teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>V závodě nejsou žádné týmy</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tým</TableHead>
                  <TableHead>Peg</TableHead>
                  <TableHead>Žluté karty</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams
                  .sort((a, b) => (a.peg_cislo || 999) - (b.peg_cislo || 999))
                  .map((tym) => (
                    <TableRow key={tym.id}>
                      <TableCell className="font-medium">{tym.nazev}</TableCell>
                      <TableCell>{tym.peg_cislo || '-'}</TableCell>
                      <TableCell>
                        <YellowCardBadge count={tym.yellowCardCount} />
                        {tym.yellowCardCount === 0 && (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tym.yellowCardCount >= 2 ? (
                          <StatusBadge status="rejected" size="sm">Diskvalifikován</StatusBadge>
                        ) : tym.zaplaceno ? (
                          <StatusBadge status="confirmed" size="sm">Aktivní</StatusBadge>
                        ) : (
                          <StatusBadge status="pending" size="sm">Nezaplaceno</StatusBadge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <ZlutaKartaDialog
                          zavodId={zavodId}
                          tym={tym as TymWithRelations}
                          currentYellowCards={tym.yellowCardCount}
                          onSuccess={fetchData}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
