"use client"

import { useState, useEffect } from "react"
import { MapPin, FileText, Navigation, ChevronDown, ChevronUp } from "lucide-react"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"
import { Button } from "@/components/ui/button"
import { PegMap, type PegLocation, type MapCenter } from "@/components/maps"
import { cn } from "@/lib/utils"

interface MapaPravidlaProps {
  /** Závod data */
  zavod: {
    id: string
    nazev: string
    misto?: string | null
    pravidla?: string | null
    map_lat?: number | null
    map_lng?: number | null
    map_zoom?: number | null
    map_location_name?: string | null
  }
  /** List of teams with peg locations */
  tymy: Array<{
    id: string
    nazev: string
    barva?: string | null
    peg_cislo?: number | null
    peg_lat?: number | null
    peg_lng?: number | null
  }>
  /** Current user's team ID (to highlight their peg) */
  userTymId?: string | null
  /** Current user's peg number */
  userPegCislo?: number | null
}

export function MapaPravidla({ zavod, tymy, userTymId, userPegCislo }: MapaPravidlaProps) {
  const [showRules, setShowRules] = useState(true)
  const [selectedPeg, setSelectedPeg] = useState<PegLocation | null>(null)

  // Check if map is configured
  const hasMapData = zavod.map_lat && zavod.map_lng

  // Check if any pegs have coordinates
  const pegsWithCoords = tymy.filter(t => t.peg_lat && t.peg_lng && t.peg_cislo !== null)
  const hasPegCoords = pegsWithCoords.length > 0

  // Convert teams to peg locations for the map
  const pegs: PegLocation[] = tymy
    .filter(tym => tym.peg_cislo !== null && tym.peg_lat && tym.peg_lng)
    .map(tym => ({
      id: tym.id,
      pegCislo: tym.peg_cislo!,
      lat: tym.peg_lat!,
      lng: tym.peg_lng!,
      tymNazev: tym.nazev,
      tymBarva: tym.id === userTymId ? "#10B981" : (tym.barva || "#3B82F6"), // Green for user's team
    }))
    .sort((a, b) => a.pegCislo - b.pegCislo)

  // Map center - use zavod coordinates or default
  const mapCenter: MapCenter = {
    lat: zavod.map_lat || 49.8175,
    lng: zavod.map_lng || 15.4730,
  }

  // Find user's peg for "Navigate to my peg" feature
  const userPeg = pegs.find(p => p.id === userTymId)

  // If no map data and no rules, don't render anything
  if (!hasMapData && !zavod.pravidla) {
    return null
  }

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Mapa a pravidla závodu
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="space-y-4">
        {/* User's peg highlight */}
        {userPegCislo && (
          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                {userPegCislo}
              </div>
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">Váš peg</p>
                <p className="text-sm text-muted-foreground">
                  {tymy.find(t => t.id === userTymId)?.nazev || "Váš tým"}
                </p>
              </div>
            </div>
            {userPeg && (
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 border-green-500/30 hover:bg-green-500/10"
                onClick={() => {
                  // Open in Google Maps for navigation
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${userPeg.lat},${userPeg.lng}`,
                    "_blank"
                  )
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Navigovat
              </Button>
            )}
          </div>
        )}

        {/* Map */}
        {hasMapData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {zavod.map_location_name || zavod.misto || "Mapa závodu"}
              </h4>
              {pegs.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {pegs.length} {pegs.length === 1 ? "peg" : pegs.length < 5 ? "pegy" : "pegů"}
                </span>
              )}
            </div>

            <PegMap
              center={mapCenter}
              zoom={zavod.map_zoom || 15}
              pegs={pegs}
              editable={false}
              height="350px"
              satellite={true}
            />

            {/* Peg legend */}
            {pegs.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {pegs.map((peg) => (
                  <button
                    key={peg.id}
                    onClick={() => setSelectedPeg(peg)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors",
                      peg.id === userTymId
                        ? "bg-green-500/20 text-green-700 dark:text-green-300 ring-2 ring-green-500"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: peg.tymBarva }}
                    >
                      {peg.pegCislo}
                    </span>
                    <span className="truncate max-w-[80px]">{peg.tymNazev}</span>
                  </button>
                ))}
              </div>
            )}

            {/* No pegs message */}
            {!hasPegCoords && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Pozice pegů zatím nejsou nastaveny
              </p>
            )}
          </div>
        )}

        {/* Rules section */}
        {zavod.pravidla && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowRules(!showRules)}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Pravidla závodu
              </h4>
              {showRules ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showRules && (
              <div className="mt-3 p-4 bg-muted/50 rounded-lg">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {/* Render rules with line breaks preserved */}
                  {zavod.pravidla.split("\n").map((paragraph, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {paragraph || <br />}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No map but has rules - just show rules */}
        {!hasMapData && zavod.pravidla && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Mapa závodu zatím není nastavena</p>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}

export default MapaPravidla
