'use client'

/**
 * useRealtimeNotifications Hook
 * Requirements: 4.1, 7.5, 12.2
 * 
 * Combines realtime subscriptions with toast notifications for:
 * - New catches pending confirmation (Req 4.1)
 * - Catch confirmation notifications (Req 12.2)
 * - Yellow card notifications (Req 7.5)
 * 
 * This hook integrates useRealtimeUlovky with the toast system
 * to provide a complete notification experience.
 */

import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { toast } from '@/hooks/use-toast'
import { useRealtimeUlovky } from './useRealtimeUlovky'
import type { Ulovek, ZlutaKarta, Potvrzeni } from '@/lib/types'

export interface UseRealtimeNotificationsOptions {
  zavodId: string
  /** Current user's team ID (to filter relevant notifications) */
  tymId?: string | null
  /** Current user's peg number (to check neighbor catches) */
  pegCislo?: number | null
  /** User's role for permission-based notifications */
  role?: 'zavodnik' | 'kapitan' | 'rozhodci' | 'poradatel' | 'divak' | null
  /** Enable/disable notifications */
  enabled?: boolean
  /** Callback when there's a new catch to confirm */
  onNewCatchToConfirm?: (ulovek: Ulovek) => void
  /** Callback when own catch is confirmed */
  onOwnCatchConfirmed?: (ulovek: Ulovek) => void
  /** Callback when team receives yellow card */
  onYellowCard?: (karta: ZlutaKarta) => void
}

export interface UseRealtimeNotificationsReturn {
  /** Whether realtime is connected */
  isConnected: boolean
}

export function useRealtimeNotifications({
  zavodId,
  tymId,
  pegCislo,
  role,
  enabled = true,
  onNewCatchToConfirm,
  onOwnCatchConfirmed,
  onYellowCard,
}: UseRealtimeNotificationsOptions): UseRealtimeNotificationsReturn {
  const supabaseRef = useRef(createClient())
  const zlutaKartyChannelRef = useRef<RealtimeChannel | null>(null)
  const potvrzeniChannelRef = useRef<RealtimeChannel | null>(null)

  // Check if a catch is from a neighbor peg
  const isNeighborPeg = useCallback(
    (catchPegCislo: number | null | undefined): boolean => {
      if (pegCislo === null || pegCislo === undefined) return false
      if (catchPegCislo === null || catchPegCislo === undefined) return false
      return Math.abs(pegCislo - catchPegCislo) === 1
    },
    [pegCislo]
  )

  // Handle new catch - show notification if it's from neighbor and needs confirmation
  const handleNewUlovek = useCallback(
    async (ulovek: Ulovek) => {
      // Only kapitans and above can confirm catches
      if (role !== 'kapitan' && role !== 'rozhodci' && role !== 'poradatel') {
        return
      }

      // Don't notify about own team's catches
      if (ulovek.tym_id === tymId) {
        return
      }

      // For kapitans, only notify about neighbor catches
      if (role === 'kapitan') {
        // We need to fetch the team's peg number
        const supabase = supabaseRef.current
        const { data: catchTeam } = await supabase
          .from('tymy')
          .select('peg_cislo')
          .eq('id', ulovek.tym_id)
          .single()

        const typedCatchTeam = catchTeam as { peg_cislo: number | null } | null
        if (!typedCatchTeam || !isNeighborPeg(typedCatchTeam.peg_cislo)) {
          return
        }
      }

      // Show notification
      toast({
        title: '🐟 Nový úlovek k potvrzení',
        description: `Tým na pegu ${ulovek.tym_id.slice(0, 8)}... zaznamenal úlovek (${ulovek.vaha} kg)`,
        variant: 'default',
      })

      onNewCatchToConfirm?.(ulovek)
    },
    [role, tymId, isNeighborPeg, onNewCatchToConfirm]
  )

  // Handle catch confirmation - notify if it's our catch
  const handleUlovekConfirmed = useCallback(
    (ulovek: Ulovek) => {
      // Only notify if it's our team's catch
      if (ulovek.tym_id !== tymId) {
        return
      }

      toast({
        title: '✅ Úlovek potvrzen',
        description: `Váš úlovek (${ulovek.vaha} kg ${ulovek.druh}) byl potvrzen!`,
        variant: 'success',
      })

      onOwnCatchConfirmed?.(ulovek)
    },
    [tymId, onOwnCatchConfirmed]
  )

  // Use the realtime ulovky hook
  const { isConnected } = useRealtimeUlovky({
    zavodId,
    enabled: enabled && !!zavodId,
    onNewUlovek: handleNewUlovek,
    onUlovekConfirmed: handleUlovekConfirmed,
  })

  // Setup yellow card notifications
  useEffect(() => {
    if (!zavodId || !enabled || !tymId) return

    const supabase = supabaseRef.current

    // Clean up existing channel
    if (zlutaKartyChannelRef.current) {
      supabase.removeChannel(zlutaKartyChannelRef.current)
    }

    const channelName = `zlute-karty-${zavodId}-${Date.now()}`

    const channel = supabase
      .channel(channelName)
      .on<ZlutaKarta>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'zlute_karty',
          filter: `zavod_id=eq.${zavodId}`,
        },
        (payload) => {
          const karta = payload.new as ZlutaKarta

          // Only notify if it's our team
          if (karta.tym_id === tymId) {
            toast({
              title: '🟡 Žlutá karta',
              description: `Váš tým obdržel žlutou kartu: ${karta.duvod}`,
              variant: 'destructive',
            })

            onYellowCard?.(karta)
          }
        }
      )
      .subscribe()

    zlutaKartyChannelRef.current = channel

    return () => {
      if (zlutaKartyChannelRef.current) {
        supabase.removeChannel(zlutaKartyChannelRef.current)
        zlutaKartyChannelRef.current = null
      }
    }
  }, [zavodId, enabled, tymId, onYellowCard])

  // Setup potvrzeni notifications for kapitans waiting for confirmation
  useEffect(() => {
    if (!zavodId || !enabled || !tymId) return

    const supabase = supabaseRef.current

    // Clean up existing channel
    if (potvrzeniChannelRef.current) {
      supabase.removeChannel(potvrzeniChannelRef.current)
    }

    const channelName = `potvrzeni-${zavodId}-${Date.now()}`

    const channel = supabase
      .channel(channelName)
      .on<Potvrzeni>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'potvrzeni',
        },
        async (payload) => {
          const potvrzeni = payload.new as Potvrzeni

          // Check if this confirmation is for one of our catches
          const { data: ulovek } = await supabase
            .from('ulovky')
            .select('tym_id, vaha, druh')
            .eq('id', potvrzeni.ulovek_id)
            .single()

          const typedUlovek = ulovek as { tym_id: string; vaha: number; druh: string } | null
          if (typedUlovek && typedUlovek.tym_id === tymId && potvrzeni.potvrzeno) {
            toast({
              title: '👍 Potvrzení přijato',
              description: `Soused potvrdil váš úlovek (${typedUlovek.vaha} kg ${typedUlovek.druh})`,
              variant: 'default',
            })
          }
        }
      )
      .subscribe()

    potvrzeniChannelRef.current = channel

    return () => {
      if (potvrzeniChannelRef.current) {
        supabase.removeChannel(potvrzeniChannelRef.current)
        potvrzeniChannelRef.current = null
      }
    }
  }, [zavodId, enabled, tymId])

  return {
    isConnected,
  }
}

export default useRealtimeNotifications
