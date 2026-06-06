'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { getZpravy } from '@/actions/zpravy.actions'
import type { Zprava } from '@/lib/types'

export function useZavodChat(zavodId: string) {
  const [zpravy, setZpravy] = useState<Zprava[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<RealtimeChannel | null>(null)

  const reload = useCallback(async () => {
    const r = await getZpravy(zavodId)
    if (r.success) setZpravy(r.data!)
  }, [zavodId])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (!zavodId) return
    const supabase = supabaseRef.current
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const channel = supabase
      .channel(`zpravy-${zavodId}-${Date.now()}`)
      .on<Zprava>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'zpravy',
          filter: `zavod_id=eq.${zavodId}`,
        },
        () => { reload() }
      )
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'))
    channelRef.current = channel
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [zavodId, reload])

  return { zpravy, isConnected, reload }
}

export default useZavodChat
