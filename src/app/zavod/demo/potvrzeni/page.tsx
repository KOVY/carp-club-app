"use client"

import { useState } from "react"
import Image from "next/image"
import { 
  Clock, 
  Fish, 
  MapPin, 
  Sparkles, 
  Check, 
  X,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DemoProtectedButton } from "@/components/zavod"
import { 
  getDemoPendingUlovky, 
  getDemoConfirmedUlovky,
  isDemoEmbargoActive 
} from "@/lib/demo-data"
import type { UlovekWithRelations } from "@/lib/types"

/**
 * Demo Potvrzeni (Confirmations) Page
 * 
 * Displays demo confirmation UI with static data (read-only).
 * Requirements: 5.6 - Demonstrate potvrzování UI
 */
export default function DemoPotvrzeniPage() {
  const pendingUlovky = getDemoPendingUlovky()
  const confirmedUlovky = getDemoConfirmedUlovky().slice(0, 3) // Show last 3 confirmed
  const defaultEmbargoActive = isDemoEmbargoActive()
  
  // Local state to toggle embargo for demonstration (Requirement 5.6)
  const [embargoActive, setEmbargoActive] = useState(defaultEmbargoActive)
  const [showConfirmed, setShowConfirmed] = useState(false)

  return (
    <div className="space-y-6">
      {/* Demo Banner with Embargo Toggle */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-purple-700">Ukázkové potvrzování</p>
          <p className="text-sm text-purple-600/80">
            Toto je demonstrace systému potvrzování úlovků. V reálném závodě zde potvrzujete úlovky sousedních týmů.
          </p>
        </div>
        {/* Embargo toggle for demonstration - Requirement 5.6 */}
        <Button
          variant={embargoActive ? "default" : "outline"}
          size="sm"
          onClick={() => setEmbargoActive(!embargoActive)}
          className="gap-2 flex-shrink-0 hidden sm:flex"
        >
          {embargoActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {embargoActive ? "Embargo ON" : "Embargo OFF"}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Potvrzování úlovků
          </h1>
          <p className="text-muted-foreground">
            Úlovky čekající na vaše potvrzení
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirmed(!showConfirmed)}
          className="gap-2"
        >
          {showConfirmed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showConfirmed ? "Skrýt potvrzené" : "Zobrazit potvrzené"}
        </Button>
      </div>

      {/* Info about confirmation system */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700 mb-1">Jak funguje potvrzování?</p>
              <ul className="text-blue-600/80 space-y-1 list-disc list-inside">
                <li>Každý úlovek musí být potvrzen sousedními pegy</li>
                <li>Potřebujete minimálně 2 potvrzení od různých týmů</li>
                <li>Můžete úlovek potvrdit nebo zamítnout s důvodem</li>
                <li>Po potvrzení se úlovek započítá do pořadí</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embargo warning */}
      {embargoActive && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Embargo je aktivní</p>
            <p className="text-sm opacity-90">
              Váhy úlovků jsou skryté. Stále můžete potvrzovat, ale váhy neuvidíte.
            </p>
          </div>
        </div>
      )}

      {/* Pending confirmations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Čekající na potvrzení
            {pendingUlovky.length > 0 && (
              <span className="ml-auto text-sm font-normal bg-primary text-primary-foreground px-2 py-1 rounded-full">
                {pendingUlovky.length}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Úlovky od sousedních týmů čekající na vaše potvrzení
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUlovky.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Fish className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Žádné úlovky k potvrzení</p>
              <p className="text-sm mt-1">
                Úlovky od sousedních pegů se zde zobrazí automaticky
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUlovky.map((ulovek) => (
                <DemoPotvrzeniItem
                  key={ulovek.id}
                  ulovek={ulovek}
                  embargoActive={embargoActive}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently confirmed (toggle) */}
      {showConfirmed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Nedávno potvrzené
            </CardTitle>
            <CardDescription>
              Poslední úlovky, které jste potvrdili
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {confirmedUlovky.map((ulovek) => (
                <DemoConfirmedItem
                  key={ulovek.id}
                  ulovek={ulovek}
                  embargoActive={embargoActive}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


// Demo confirmation item component (read-only with protected actions)
interface DemoPotvrzeniItemProps {
  ulovek: UlovekWithRelations
  embargoActive: boolean
}

function DemoPotvrzeniItem({ ulovek, embargoActive }: DemoPotvrzeniItemProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "numeric",
    })
  }

  // Calculate confirmation progress
  const confirmationCount = ulovek.potvrzeni?.filter(p => p.potvrzeno).length || 0
  const requiredConfirmations = 2

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex gap-4">
        {/* Photo thumbnail */}
        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {ulovek.foto_url ? (
            <Image
              src={ulovek.foto_url}
              alt={`Úlovek ${ulovek.druh}`}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Fish className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Catch details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                {ulovek.druh === "kapr" ? "🐟 Kapr" : "🐠 Amur"}
                <StatusBadge status="pending">Čeká</StatusBadge>
              </h4>
              {!embargoActive ? (
                <p className="text-2xl font-bold">{ulovek.vaha} kg</p>
              ) : (
                <p className="text-lg text-muted-foreground italic">Váha skryta (embargo)</p>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{formatDate(ulovek.cas)}</p>
              <p>{formatTime(ulovek.cas)}</p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Peg {ulovek.tym?.peg_cislo}
            </span>
            <span>Tým: {ulovek.tym?.nazev}</span>
          </div>

          {ulovek.chytil && (
            <p className="text-sm text-muted-foreground mt-1">
              Chytil: {ulovek.chytil.jmeno}
            </p>
          )}
        </div>
      </div>

      {/* Confirmation progress */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Potvrzení:</span>
        <div className="flex gap-1">
          {Array.from({ length: requiredConfirmations }).map((_, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                i < confirmationCount
                  ? "bg-green-500/20 text-green-600 border border-green-500/30"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {i < confirmationCount ? <Check className="h-3 w-3" /> : i + 1}
            </div>
          ))}
        </div>
        <span className="text-muted-foreground">
          ({confirmationCount}/{requiredConfirmations})
        </span>
      </div>

      {/* Action buttons - Protected (Requirement 5.7) */}
      <div className="flex gap-2 pt-2 border-t">
        <DemoProtectedButton
          actionDescription="zamítnutí úlovku"
          variant="outline"
          className="flex-1 gap-2"
        >
          <X className="h-4 w-4" />
          Zamítnout
        </DemoProtectedButton>
        <DemoProtectedButton
          actionDescription="potvrzení úlovku"
          variant="default"
          className="flex-1 gap-2"
        >
          <Check className="h-4 w-4" />
          Potvrdit
        </DemoProtectedButton>
      </div>
    </div>
  )
}

// Demo confirmed item component (read-only display)
interface DemoConfirmedItemProps {
  ulovek: UlovekWithRelations
  embargoActive: boolean
}

function DemoConfirmedItem({ ulovek, embargoActive }: DemoConfirmedItemProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="border rounded-lg p-4 bg-green-500/5 border-green-500/20">
      <div className="flex gap-4">
        {/* Photo thumbnail */}
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {ulovek.foto_url ? (
            <Image
              src={ulovek.foto_url}
              alt={`Úlovek ${ulovek.druh}`}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Fish className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Catch details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                {ulovek.druh === "kapr" ? "🐟 Kapr" : "🐠 Amur"}
                {!embargoActive && <span className="font-bold">{ulovek.vaha} kg</span>}
                <StatusBadge status="confirmed">Potvrzeno</StatusBadge>
              </h4>
              <p className="text-sm text-muted-foreground">
                {ulovek.tym?.nazev} • Peg {ulovek.tym?.peg_cislo}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{formatTime(ulovek.cas)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
