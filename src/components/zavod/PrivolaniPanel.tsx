'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getZpravy, vyriditPrivolani } from '@/actions/zpravy.actions'
import type { Zprava } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'

export function PrivolaniPanel({ zavodId }: { zavodId: string }) {
  const { toast } = useToast()
  const [privolani, setPrivolani] = useState<Zprava[]>([])
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<RealtimeChannel | null>(null)

  const reload = useCallback(async () => {
    const r = await getZpravy(zavodId)
    if (r.success) {
      setPrivolani(r.data!.filter(z => z.typ === 'privolani' && !z.vyrizeno))
    }
  }, [zavodId])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const supabase = supabaseRef.current
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel(`privolani-${zavodId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'zpravy',
          filter: `zavod_id=eq.${zavodId}`,
        },
        (payload: any) => {
          if (payload.new?.typ === 'privolani') {
            toast({
              title: '🔔 Přivolání rozhodčího',
              description: `Peg ${payload.new.peg_cislo ?? '?'}`,
            })
            // Zvukové upozornění
            try {
              const AudioCtx =
                window.AudioContext ||
                (window as any).webkitAudioContext
              const a = new AudioCtx()
              const o = a.createOscillator()
              o.frequency.value = 880
              o.connect(a.destination)
              o.start()
              o.stop(a.currentTime + 0.2)
            } catch {
              // Zvuk nepodporován — ignoruj
            }
            reload()
          }
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
  }, [zavodId, reload, toast])

  const vyridit = async (id: string) => {
    const r = await vyriditPrivolani(id)
    if (r.success) {
      reload()
    } else {
      toast({
        title: 'Chyba',
        description: r.error?.message,
        variant: 'destructive',
      })
    }
  }

  if (privolani.length === 0) return null

  return (
    <GlassCard className="border-amber-500/50 bg-amber-500/5">
      <GlassCardHeader className="pb-3">
        <GlassCardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Bell className="h-5 w-5 animate-pulse" />
          Přivolání rozhodčího
          <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
            {privolani.length}
          </span>
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <ul className="space-y-2">
          {privolani.map(z => (
            <li
              key={z.id}
              className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  Peg {z.peg_cislo ?? '?'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(z.created_at).toLocaleTimeString('cs-CZ', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/50 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                onClick={() => vyridit(z.id)}
              >
                Vyřídit
              </Button>
            </li>
          ))}
        </ul>
      </GlassCardContent>
    </GlassCard>
  )
}
