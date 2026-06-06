"use client"

import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Zprava } from "@/lib/types"

export function DisplejPrivolani({ privolani }: { privolani: Zprava[] }) {
  if (privolani.length === 0) return null
  return (
    <div>
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-accent">
        <Bell className="h-6 w-6 animate-leader-pulse" /> Přivolání rozhodčího
      </h2>
      <ul className="space-y-2">
        {privolani.map((z) => (
          <li
            key={z.id}
            className={cn(
              "rounded-xl border px-4 py-3 text-xl font-bold",
              "bg-accent/10 border-accent/40 text-accent"
            )}
          >
            🔔 Peg {z.peg_cislo ?? "?"} volá rozhodčího
          </li>
        ))}
      </ul>
    </div>
  )
}
