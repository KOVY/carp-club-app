"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Fish, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { UlovekForm, PotvrzeniList } from "@/components/zavod"
import { SkeletonLoader } from "@/components/ui/SkeletonLoader"
import { ErrorState } from "@/components/common/ErrorState"
import { StatusMessage } from "@/components/common/StatusMessage"
import { getUlovkyKPotvrzeni } from "@/actions/ulovky.actions"
import { createClient } from "@/lib/supabase/client"
import type { UlovekWithRelations, UserRole } from "@/lib/types"

/**
 * Úlovky page - Submit catches and confirm neighbor catches
 * 
 * Requirements:
 * - 3.1: Create catch with weight, type, photo, timestamp
 * - 4.1: Display catches waiting for confirmation from neighbor pegs
 */
export default function UlovkyPage() {
  const params = useParams()
  const zavodId = params.zavodId as string

  const [pendingUlovky, setPendingUlovky] = useState<UlovekWithRelations[]>([])
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zavodActive, setZavodActive] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()

      // Always fetch zavod state first (doesn't require auth)
      const { data: zavod, error: zavodError } = await supabase
        .from('zavody')
        .select('stav, datum_start, datum_end')
        .eq('id', zavodId)
        .single()

      // Calculate actual state based on time (not just DB value)
      const zavodData = zavod as { stav: string; datum_start: string; datum_end: string } | null
      let isActive = false

      if (zavodData) {
        const now = new Date()
        const startTime = new Date(zavodData.datum_start)
        const endTime = new Date(zavodData.datum_end)

        // Competition is active if current time is between start and end
        isActive = now >= startTime && now < endTime

        console.log('fetchData: zavod state:', {
          zavodId,
          dbStav: zavodData.stav,
          datum_start: zavodData.datum_start,
          datum_end: zavodData.datum_end,
          now: now.toISOString(),
          isActive
        })
      } else {
        console.log('fetchData: zavod not found', { zavodId, error: zavodError?.message })
      }

      setZavodActive(isActive)

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // User not logged in - don't show error, just show "no permissions" state
        // This allows the page to work with magic link auth flow
        setIsLoading(false)
        return
      }

      // Get user role in this zavod
      const { data: roleData } = await supabase
        .from('zavod_role')
        .select('role')
        .eq('user_id', user.id)
        .eq('zavod_id', zavodId)
        .single()

      if (roleData) {
        setUserRole((roleData as { role: UserRole }).role)
      } else {
        // Check if user is team member
        const { data: teams } = await supabase
          .from('tymy')
          .select('id')
          .eq('zavod_id', zavodId)

        if (teams && teams.length > 0) {
          const teamIds = (teams as { id: string }[]).map(t => t.id)
          const { data: membership } = await supabase
            .from('clenove_tymu')
            .select('role')
            .eq('user_id', user.id)
            .in('tym_id', teamIds)
            .single()

          if (membership) {
            setUserRole((membership as { role: UserRole }).role)
          }
        }
      }

      // Fetch pending catches for confirmation
      const result = await getUlovkyKPotvrzeni(zavodId)
      if (result.success && result.data) {
        setPendingUlovky(result.data.ulovky)
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
    fetchData()
  }, [fetchData])

  // Separate effect for auth state changes to avoid loops
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        // Only refetch on actual sign in, not initial session
        if (event === 'SIGNED_IN') {
          fetchData()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [zavodId]) // Only depend on zavodId, not fetchData

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchData()
  }

  const handleUlovekSubmitted = () => {
    // Refresh the pending list after submitting a catch
    fetchData()
  }

  const handleConfirmationComplete = () => {
    // Refresh the pending list after confirming a catch
    fetchData()
  }

  // Závodníci a kapitáni mohou přidávat úlovky, rozhodčí a pořadatelé také
  const canSubmitCatch = userRole === 'zavodnik' || userRole === 'kapitan' || userRole === 'rozhodci' || userRole === 'poradatel'
  // Pouze kapitáni, rozhodčí a pořadatelé mohou potvrzovat úlovky sousedních týmů
  const canConfirmCatch = userRole === 'kapitan' || userRole === 'rozhodci' || userRole === 'poradatel'

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Fish className="h-6 w-6" />
              Úlovky
            </h1>
            <p className="text-muted-foreground">Načítání...</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonLoader variant="card" height={400} />
          <SkeletonLoader variant="card" height={400} />
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fish className="h-6 w-6" />
            Úlovky
          </h1>
          <p className="text-muted-foreground">
            Zaznamenejte nový úlovek nebo potvrďte úlovky sousedních týmů
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Obnovit
        </Button>
      </div>

      {/* Warning if zavod is not active */}
      {!zavodActive && !isLoading && (
        <StatusMessage
          variant="info"
          title="Závod neprobíhá"
          description="Úlovky lze zadávat pouze během aktivního závodu."
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Submit catch form */}
        {canSubmitCatch && (
          <div>
            <UlovekForm
              zavodId={zavodId}
              onSuccess={handleUlovekSubmitted}
              disabled={!zavodActive}
            />
          </div>
        )}

        {/* Pending confirmations */}
        {canConfirmCatch && (
          <div>
            <PotvrzeniList
              ulovky={pendingUlovky}
              onConfirmationComplete={handleConfirmationComplete}
            />
          </div>
        )}
      </div>

      {/* Info for users without permissions */}
      {!canSubmitCatch && !canConfirmCatch && (
        <div className="text-center py-12 text-muted-foreground">
          <Fish className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nemáte oprávnění k zadávání nebo potvrzování úlovků</p>
          <p className="text-sm mt-1">
            Pouze kapitáni týmů, rozhodčí a pořadatelé mohou pracovat s úlovky
          </p>
        </div>
      )}
    </div>
  )
}
