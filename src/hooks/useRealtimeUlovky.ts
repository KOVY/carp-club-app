'use client'

/**
 * useRealtimeUlovky Hook
 * Requirements: 12.1, 12.4
 * 
 * Provides real-time subscription to ulovky (catches) table changes.
 * Uses Supabase Realtime for live updates.
 * 
 * Features:
 * - Subscribes to INSERT, UPDATE, DELETE events on ulovky table
 * - Filters by zavod_id for relevant updates only
 * - Automatically reconnects on connection failure (Req 12.5)
 * - Provides callback for handling new catches to confirm
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Ulovek } from '@/lib/types'

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RealtimeUlovekEvent {
  eventType: RealtimeEventType
  new: Ulovek | null
  old: Partial<Ulovek> | null
}

export interface UseRealtimeUlovkyOptions {
  zavodId: string
  /** Called when any ulovek change occurs */
  onUlovekChange?: (event: RealtimeUlovekEvent) => void
  /** Called specifically when a new ulovek is inserted */
  onNewUlovek?: (ulovek: Ulovek) => void
  /** Called when an ulovek is confirmed (stav changes to 'potvrzeno') */
  onUlovekConfirmed?: (ulovek: Ulovek) => void
  /** Called when connection status changes */
  onConnectionChange?: (connected: boolean) => void
  /** Enable/disable the subscription */
  enabled?: boolean
}

export interface UseRealtimeUlovkyReturn {
  /** Whether the realtime connection is active */
  isConnected: boolean
  /** Any error that occurred */
  error: Error | null
  /** Manually reconnect */
  reconnect: () => void
}

export function useRealtimeUlovky({
  zavodId,
  onUlovekChange,
  onNewUlovek,
  onUlovekConfirmed,
  onConnectionChange,
  enabled = true,
}: UseRealtimeUlovkyOptions): UseRealtimeUlovkyReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  // Handle realtime payload
  const handlePayload = useCallback(
    (payload: RealtimePostgresChangesPayload<Ulovek>) => {
      const eventType = payload.eventType as RealtimeEventType
      const newRecord = payload.new as Ulovek | null
      const oldRecord = payload.old as Partial<Ulovek> | null

      // Call general change handler
      onUlovekChange?.({
        eventType,
        new: newRecord,
        old: oldRecord,
      })

      // Handle specific events
      if (eventType === 'INSERT' && newRecord) {
        onNewUlovek?.(newRecord)
      }

      // Check if ulovek was just confirmed
      if (eventType === 'UPDATE' && newRecord && oldRecord) {
        if (oldRecord.stav !== 'potvrzeno' && newRecord.stav === 'potvrzeno') {
          onUlovekConfirmed?.(newRecord)
        }
      }
    },
    [onUlovekChange, onNewUlovek, onUlovekConfirmed]
  )

  // Setup subscription
  const setupSubscription = useCallback(() => {
    if (!zavodId || !enabled) return

    const supabase = supabaseRef.current

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Create new channel with unique name
    const channelName = `ulovky-${zavodId}-${Date.now()}`
    
    const channel = supabase
      .channel(channelName)
      .on<Ulovek>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ulovky',
          filter: `zavod_id=eq.${zavodId}`,
        },
        handlePayload
      )
      .subscribe((status) => {
        const connected = status === 'SUBSCRIBED'
        setIsConnected(connected)
        onConnectionChange?.(connected)
        
        if (status === 'CHANNEL_ERROR') {
          setError(new Error('Realtime connection error'))
        } else if (status === 'TIMED_OUT') {
          setError(new Error('Realtime connection timed out'))
          // Auto-reconnect on timeout (Req 12.5)
          setTimeout(() => setupSubscription(), 5000)
        } else {
          setError(null)
        }
      })

    channelRef.current = channel
  }, [zavodId, enabled, handlePayload, onConnectionChange])

  // Reconnect function
  const reconnect = useCallback(() => {
    setError(null)
    setupSubscription()
  }, [setupSubscription])

  // Setup and cleanup
  useEffect(() => {
    setupSubscription()

    return () => {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [setupSubscription])

  return {
    isConnected,
    error,
    reconnect,
  }
}

export default useRealtimeUlovky
