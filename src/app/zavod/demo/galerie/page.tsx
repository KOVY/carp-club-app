"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Camera, Sparkles } from "lucide-react"
import { getDemoConfirmedUlovky, demoTymy, isDemoEmbargoActive } from "@/lib/demo-data"
import type { UlovekWithRelations } from "@/lib/types"

function DemoGalleryCard({ ulovek }: { ulovek: UlovekWithRelations }) {
  const badgeClass = ulovek.druh === "kapr" ? "bg-blue-500/90 text-white" : "bg-green-500/90 text-white"
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
      <Image src={ulovek.foto_url} alt={ulovek.druh} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover" loading="lazy" />
      <div className="absolute top-2 left-2">
        <span className={"px-1.5 py-0.5 text-xs font-medium rounded " + badgeClass}>
          {ulovek.druh === "kapr" ? "K" : "A"}
        </span>
      </div>
    </div>
  )
}

export default function DemoGaleriePage() {
  const ulovky = getDemoConfirmedUlovky()
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <p className="font-medium text-purple-700">Ukázková galerie</p>
      </div>
      <h1 className="text-2xl font-bold flex items-center gap-2"><Camera className="h-6 w-6" />Fotogalerie</h1>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {ulovky.map((ulovek) => <DemoGalleryCard key={ulovek.id} ulovek={ulovek} />)}
      </div>
    </div>
  )
}
