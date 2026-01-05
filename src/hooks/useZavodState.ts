'use client'

/**
 * useZavodState Hook
 * Requirements: 1.3, 6.1
 * 
 * Provides real-time state information about a zavod (competition).
 * 
 * Features:
 * - Tracks zavod state (priprava, probiha, ukoncen)
 * - Monitors embargo status
 * - Calculates time-based states (is competition active, time remaining)
 * - Real-time updates via Supabase Realtime
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Zavod, StavZavodu } from '@/lib/types'

export interface UseZavodStateOptions {
  zavodId: string
  /** Enable/disable fetching and realtime */
  enabled?: boolean
  /** Interval for time-based updates (ms) */
  updateInterval?: number
}

export interface UseZavodStateReturn {
  /** The zavod data */
  zavod: Zavod | null
  /** Current state of the zavod */
  stav: StavZavodu | null
  /** Whether the zavod is currently active (between start and end) */
  isActive: boolean
  /** Whether embargo is currently active */
  isEmbargoActive: boolean
  /** Whether catches can be submitted (zavod is active) */
  canSubmitCatches: boolean
  /** Time until zavod starts (null if already started) */
  timeUntilStart: number | null
  /** Time until zavod ends (null if already ended) */
  timeUntilEnd: number | null
  /** Time until embargo starts (null if no embargo or already active) */
  timeUntilEmbargo: number | null
  /** Loading state */
  isLoading: boolean
  /** Error if any */
  error: Error | null
  /** Refetch zavod data */
  refetch: () => Promise<void>
}

export function useZavodState({
  zavodId,
  enabled = true,
  updateInterval = 1000, // Update every second for time calculations
}: UseZavodStateOptions): UseZavodStateReturn {
  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [now, setNow] = useState(() => new Date())
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  // Fetch zavod data
  const fetchZavod = useCallback(async () => {
    if (!zavodId || !enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = supabaseRef.current

      const { data, error: fetchError } = await supabase
        .from('zavody')
        .select('*')
        .eq('id', zavodId)
        .single()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setZavod(data as Zavod)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch zavod'))
    } finally {
      setIsLoading(false)
    }
  }, [zavodId, enabled])

  // Setup realtime subscription for zavod changes
  useEffect(() => {
    if (!zavodId || !enabled) return

    const supabase = supabaseRef.current

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channelName = `zavod-${zavodId}-${Date.now()}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'zavody',
          filter: `id=eq.${zavodId}`,
        },
        (payload) => {
          setZavod(payload.new as Zavod)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [zavodId, enabled])

  // Fetch on mount
  useEffect(() => {
    fetchZavod()
  }, [fetchZavod])

  // Update current time periodically for time-based calculations
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      setNow(new Date())
    }, updateInterval)

    return () => clearInterval(interval)
  }, [enabled, updateInterval])

  // Calculate derived state values
  const derivedState = useMemo(() => {
    if (!zavod) {
      return {
        stav: null as StavZavodu | null,
        isActive: false,
        isEmbargoActive: false,
        canSubmitCatches: false,
        timeUntilStart: null as number | null,
        timeUntilEnd: null as number | null,
        timeUntilEmbargo: null as number | null,
      }
    }

    const startTime = new Date(zavod.datum_start)
    const endTime = new Date(zavod.datum_end)
    const embargoTime = zavod.embargo_od ? new Date(zavod.embargo_od) : null
    const currentTime = now.getTime()

    // Calculate time differences
    const msUntilStart = startTime.getTime() - currentTime
    const msUntilEnd = endTime.getTime() - currentTime
    const msUntilEmbargo = embargoTime ? embargoTime.getTime() - currentTime : null

    // Determine actual state based on time
    let computedStav: StavZavodu = zavod.stav as StavZavodu
    
    // Override based on actual time if stav is not manually set
    if (currentTime < startTime.getTime()) {
      computedStav = 'priprava'
    } else if (currentTime >= startTime.getTime() && currentTime < endTime.getTime()) {
      computedStav = 'probiha'
    } else {
      computedStav = 'ukoncen'
    }

    // Check if embargo is active
    const isEmbargoActive = embargoTime !== null && 
      currentTime >= embargoTime.getTime() && 
      currentTime < endTime.getTime()

    // Can submit catches only when zavod is active
    const isActive = computedStav === 'probiha'
    const canSubmitCatches = isActive

    return {
      stav: computedStav,
      isActive,
      isEmbargoActive,
      canSubmitCatches,
      timeUntilStart: msUntilStart > 0 ? msUntilStart : null,
      timeUntilEnd: msUntilEnd > 0 ? msUntilEnd : null,
      timeUntilEmbargo: msUntilEmbargo !== null && msUntilEmbargo > 0 ? msUntilEmbargo : null,
    }
  }, [zavod, now])

  return {
    zavod,
    ...derivedState,
    isLoading,
    error,
    refetch: fetchZavod,
  }
}

/**
 * Format milliseconds to human-readable time string
 */
export function formatTimeRemaining(ms: number | null): string {
  if (ms === null || ms <= 0) return ''

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export default useZavodState
