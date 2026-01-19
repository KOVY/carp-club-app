'use client'

/**
 * usePendingConfirmations Hook
 * Requirement: 3.8
 * 
 * Provides real-time count of pending confirmations for the current user.
 * Used for displaying badge on the Potvrzení navigation item.
 * 
 * Features:
 * - Fetches initial count on mount
 * - Subscribes to real-time updates on ulovky table
 * - Automatically updates count when catches are added/confirmed
 * - Returns 0 for unauthenticated users
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserRoleInZavod } from '@/actions/ulovky.actions'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Tym, ClenTymu } from '@/lib/types'

export interface UsePendingConfirmationsOptions {
  /** Závod ID to check pending confirmations for */
  zavodId: string
  /** Enable/disable the hook */
  enabled?: boolean
}

export interface UsePendingConfirmationsReturn {
  /** Number of pending confirmations */
  count: number
  /** Loading state */
  isLoading: boolean
  /** Error if any */
  error: Error | null
  /** Refetch the count */
  refetch: () => Promise<void>
}

export function usePendingConfirmations({
  zavodId,
  enabled = true,
}: UsePendingConfirmationsOptions): UsePendingConfirmationsReturn {
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  // Fetch pending confirmations count
  const fetchCount = useCallback(async () => {
    if (!zavodId || !enabled) {
      setCount(0)
      setIsLoading(false)
      return
    }

    try {
      const supabase = supabaseRef.current

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        // Not authenticated - no pending confirmations
        setCount(0)
        setIsLoading(false)
        return
      }

      // Check if user is rozhodci or poradatel
      const { data: zavodRole } = await supabase
        .from('zavod_role')
        .select('role')
        .eq('user_id', user.id)
        .eq('zavod_id', zavodId)
        .single()

      const isRozhodciOrPoradatel = zavodRole && 
        ['rozhodci', 'poradatel'].includes((zavodRole as { role: string }).role)

      // Get all teams in zavod with their peg numbers
      const { data: teams } = await supabase
        .from('tymy')
        .select('id, peg_cislo')
        .eq('zavod_id', zavodId)

      if (!teams || teams.length === 0) {
        setCount(0)
        setIsLoading(false)
        return
      }

      const teamsData = teams as Pick<Tym, 'id' | 'peg_cislo'>[]

      // Find user's team membership using server action (bypasses RLS)
      const roleResult = await getUserRoleInZavod(zavodId)
      const membership = roleResult.success && roleResult.data?.tymId
        ? { tym_id: roleResult.data.tymId, role: roleResult.data.role }
        : null

      // Get catches waiting for confirmation (stav = 'ceka')
      const { data: ulovky, error: ulovkyError } = await supabase
        .from('ulovky')
        .select(`
          id,
          tym_id,
          potvrzeni(
            id,
            potvrdil_user_id,
            potvrdil_tym_id
          )
        `)
        .eq('zavod_id', zavodId)
        .eq('stav', 'ceka')

      if (ulovkyError) {
        throw new Error('Failed to fetch pending confirmations')
      }

      interface UlovekWithPotvrzeni {
        id: string
        tym_id: string
        potvrzeni: Array<{
          id: string
          potvrdil_user_id: string
          potvrdil_tym_id: string
        }> | null
      }

      let filteredCount = 0

      // If user is rozhodci/poradatel, count all pending catches they haven't confirmed
      if (isRozhodciOrPoradatel) {
        filteredCount = (ulovky as UlovekWithPotvrzeni[]).filter(u => {
          const alreadyConfirmed = u.potvrzeni?.some(
            p => p.potvrdil_user_id === user.id
          )
          return !alreadyConfirmed
        }).length
      } else if (membership) {
        // For kapitans, count only neighbor peg catches
        const membershipData = membership as Pick<ClenTymu, 'tym_id' | 'role'>
        
        // Only kapitans can confirm catches
        if (membershipData.role !== 'kapitan') {
          setCount(0)
          setIsLoading(false)
          return
        }

        // Get user's peg number
        const userTeam = teamsData.find(t => t.id === membershipData.tym_id)
        if (!userTeam || userTeam.peg_cislo === null) {
          setCount(0)
          setIsLoading(false)
          return
        }

        const userPeg = userTeam.peg_cislo

        // Filter to only neighbor pegs (peg ± 1) and exclude own team
        filteredCount = (ulovky as UlovekWithPotvrzeni[]).filter(u => {
          // Exclude own team's catches
          if (u.tym_id === membershipData.tym_id) {
            return false
          }

          // Check if user already confirmed this catch
          const alreadyConfirmed = u.potvrzeni?.some(
            p => p.potvrdil_user_id === user.id || p.potvrdil_tym_id === membershipData.tym_id
          )
          if (alreadyConfirmed) {
            return false
          }

          // Check if catch is from neighbor peg
          const catchTeam = teamsData.find(t => t.id === u.tym_id)
          if (!catchTeam || catchTeam.peg_cislo === null) {
            return false
          }

          const pegDiff = Math.abs(catchTeam.peg_cislo - userPeg)
          return pegDiff === 1
        }).length
      }

      setCount(filteredCount)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch pending confirmations'))
      setCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [zavodId, enabled])

  // Setup real-time subscription
  useEffect(() => {
    if (!zavodId || !enabled) return

    const supabase = supabaseRef.current

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Create new channel for real-time updates
    const channelName = `pending-confirmations-${zavodId}-${Date.now()}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ulovky',
          filter: `zavod_id=eq.${zavodId}`,
        },
        () => {
          // Refetch count when ulovky changes
          fetchCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'potvrzeni',
        },
        () => {
          // Refetch count when potvrzeni changes
          fetchCount()
        }
      )
      .subscribe()

    channelRef.current = channel

    // Initial fetch
    fetchCount()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [zavodId, enabled, fetchCount])

  return {
    count,
    isLoading,
    error,
    refetch: fetchCount,
  }
}

export default usePendingConfirmations
