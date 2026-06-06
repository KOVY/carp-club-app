'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { MessageCircle, Send, Bell, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { useZavodChat } from '@/hooks/useZavodChat'
import { odeslatZpravu, privolatRozhodciho } from '@/actions/zpravy.actions'

interface ChatPanelProps {
  zavodId: string
  canPrivolat: boolean
}

export function ChatPanel({ zavodId, canPrivolat }: ChatPanelProps) {
  const { toast } = useToast()
  const { zpravy } = useZavodChat(zavodId)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Při nové zprávě scrolluj dolů
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [zpravy])

  const poslat = () => {
    if (!text.trim()) return
    startTransition(async () => {
      const r = await odeslatZpravu({ zavodId, text })
      if (!r.success) {
        toast({ title: 'Chyba', description: r.error?.message, variant: 'destructive' })
        return
      }
      setText('')
    })
  }

  const privolat = () => {
    startTransition(async () => {
      const r = await privolatRozhodciho(zavodId)
      toast(
        r.success
          ? { title: '🔔 Rozhodčí přivolán' }
          : { title: 'Chyba', description: r.error?.message, variant: 'destructive' }
      )
    })
  }

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat závodu
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="space-y-3">
        {/* Tlačítko přivolání rozhodčího */}
        {canPrivolat && (
          <Button
            variant="outline"
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={privolat}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Přivolat rozhodčího
          </Button>
        )}

        {/* Seznam zpráv */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {zpravy.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              Zatím žádné zprávy
            </p>
          )}
          {zpravy.map((z) =>
            z.typ === 'privolani' ? (
              <div
                key={z.id}
                className={`rounded-lg border px-3 py-2 text-sm bg-destructive/10 border-destructive/30 ${z.vyrizeno ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    🔔 Přivolání — Peg {z.peg_cislo ?? '?'}
                    {z.vyrizeno && <span className="ml-1 font-normal">(vyřízeno)</span>}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTime(z.created_at)}
                  </span>
                </div>
              </div>
            ) : (
              <div key={z.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{z.autor_jmeno}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTime(z.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 text-muted-foreground break-words">{z.text}</p>
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>

        {/* Pole pro novou zprávu */}
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                poslat()
              }
            }}
            placeholder="Napište zprávu…"
            disabled={isPending}
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <Button
            size="icon"
            onClick={poslat}
            disabled={isPending || !text.trim()}
            aria-label="Odeslat zprávu"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
