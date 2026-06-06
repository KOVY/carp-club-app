"use client"

import { DemoChatPanel } from "@/components/zavod/DemoChatPanel"

export default function DemoChatPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">💬 Závodní chat</h1>
        <p className="text-sm text-muted-foreground">
          Týmy komunikují a přivolávají rozhodčího. V reálném závodě běží živě — tady je ukázka.
        </p>
      </div>
      <DemoChatPanel />
    </div>
  )
}
