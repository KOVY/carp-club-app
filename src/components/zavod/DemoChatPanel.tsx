"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, Send, Bell } from "lucide-react"
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard"
import { DemoProtectedButton } from "@/components/zavod"
import { demoChat, demoChatIncoming } from "@/lib/demo-data"
import { cn } from "@/lib/utils"
import type { Zprava } from "@/lib/types"

export function DemoChatPanel() {
  const [zpravy, setZpravy] = useState<Zprava[]>(demoChat)
  const [bellFlash, setBellFlash] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)

  // Živý náznak: po ~3s přiteče nová zpráva + zvoneček pípne + zableskne
  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    const t = setTimeout(() => {
      setZpravy((prev) => [...prev, demoChatIncoming])
      try {
        const AudioCtx =
          window.AudioContext || (window as any).webkitAudioContext
        const a = new AudioCtx()
        const o = a.createOscillator()
        o.frequency.value = 880
        o.connect(a.destination)
        o.start()
        o.stop(a.currentTime + 0.2)
      } catch {
        // zvuk nepodporován — ignoruj
      }
      if (!prefersReduced) {
        setBellFlash(true)
        setTimeout(() => setBellFlash(false), 1200)
      }
    }, 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [zpravy])

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Závodní chat
          <Bell
            className={cn(
              "ml-auto h-5 w-5 text-accent transition-all",
              bellFlash && "animate-leader-pulse scale-110"
            )}
          />
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="space-y-3">
        <DemoProtectedButton
          actionDescription="přivolání rozhodčího"
          variant="outline"
          className="w-full border-accent/50 text-accent hover:bg-accent/10"
        >
          <Bell className="h-4 w-4 mr-2" />
          Přivolat rozhodčího
        </DemoProtectedButton>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {zpravy.map((z) =>
            z.typ === "privolani" ? (
              <div
                key={z.id}
                className="rounded-lg border px-3 py-2 text-sm bg-accent/10 border-accent/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-accent">
                    🔔 Přivolání — Peg {z.peg_cislo ?? "?"}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTime(z.created_at)}
                  </span>
                </div>
              </div>
            ) : (
              <div key={z.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{z.autor_jmeno}</span>
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

        <div className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="Napište zprávu…"
            readOnly
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <DemoProtectedButton actionDescription="odeslání zprávy" size="icon">
            <Send className="h-4 w-4" />
          </DemoProtectedButton>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
