"use client"

import { useState, useEffect, useCallback } from "react"
import { MapPin, Save, Loader2, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"
import { PegMap, LocationSearch, type PegLocation, type MapCenter } from "@/components/maps"
import { useToast } from "@/hooks/use-toast"
import { updateZavod } from "@/actions/admin.actions"
import { updateTymPegLocation } from "@/actions/tym.actions"
import type { Zavod, Tym } from "@/lib/types"

// Extended types with map fields (until migration is applied and types regenerated)
interface ZavodWithMap extends Zavod {
  map_lat?: number | null
  map_lng?: number | null
  map_zoom?: number | null
  map_location_name?: string | null
}

interface TymWithMap extends Tym {
  peg_lat?: number | null
  peg_lng?: number | null
}

interface MapSettingsProps {
  zavod: ZavodWithMap
  tymy: TymWithMap[]
  onUpdate?: () => void
}

export function MapSettings({ zavod, tymy, onUpdate }: MapSettingsProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  // Map state
  const [mapCenter, setMapCenter] = useState<MapCenter>({
    lat: zavod.map_lat || 49.8175,
    lng: zavod.map_lng || 15.4730,
  })
  const [mapZoom] = useState(zavod.map_zoom || 15)
  const [locationName, setLocationName] = useState(zavod.map_location_name || "")

  // Pegs state
  const [pegs, setPegs] = useState<PegLocation[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize pegs from teams
  useEffect(() => {
    const teamPegs: PegLocation[] = tymy
      .filter(tym => tym.peg_cislo !== null)
      .map(tym => ({
        id: tym.id,
        pegCislo: tym.peg_cislo!,
        lat: tym.peg_lat || mapCenter.lat + (Math.random() - 0.5) * 0.001,
        lng: tym.peg_lng || mapCenter.lng + (Math.random() - 0.5) * 0.001,
        tymNazev: tym.nazev,
        tymBarva: tym.barva || "#3B82F6",
      }))
      .sort((a, b) => a.pegCislo - b.pegCislo)

    setPegs(teamPegs)
  }, [tymy, mapCenter.lat, mapCenter.lng])

  // Handle location selection from search
  const handleLocationSelect = useCallback((location: { lat: number; lng: number; name: string }) => {
    setMapCenter({ lat: location.lat, lng: location.lng })
    setLocationName(location.name)
    setHasChanges(true)
  }, [])

  // Handle map center change
  const handleCenterChange = useCallback((center: MapCenter) => {
    setMapCenter(center)
    setHasChanges(true)
  }, [])

  // Handle peg changes
  const handlePegChange = useCallback((updatedPegs: PegLocation[]) => {
    setPegs(updatedPegs)
    setHasChanges(true)
  }, [])

  // Save map settings
  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Save zavod map settings
      const zavodResult = await updateZavod(zavod.id, {
        map_lat: mapCenter.lat,
        map_lng: mapCenter.lng,
        map_zoom: mapZoom,
        map_location_name: locationName || null,
      })

      if (!zavodResult.success) {
        throw new Error(zavodResult.error?.message || "Nepodařilo se uložit nastavení mapy")
      }

      // Save peg locations for each team
      for (const peg of pegs) {
        const result = await updateTymPegLocation(peg.id, {
          peg_lat: peg.lat,
          peg_lng: peg.lng,
        })

        if (!result.success) {
          console.error(`Failed to update peg location for team ${peg.id}:`, result.error)
        }
      }

      toast({
        title: "Uloženo",
        description: "Nastavení mapy bylo uloženo",
      })

      setHasChanges(false)
      onUpdate?.()
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodařilo se uložit nastavení",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Mapa závodu
        </GlassCardTitle>
        <GlassCardDescription>
          Nastavte polohu rybníka a rozmístění pegů na mapě
        </GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent className="space-y-4">
        {/* Location search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Vyhledat lokalitu</label>
          <LocationSearch
            onLocationSelect={handleLocationSelect}
            defaultValue={locationName}
            placeholder="Zadejte název rybníka nebo lokality..."
          />
        </div>

        {/* Info about editing */}
        <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg text-sm">
          <Info className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-700 dark:text-blue-300">Jak umístit pegy:</p>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              <li>1. Vyhledejte rybník pomocí pole výše</li>
              <li>2. Klikněte na mapu pro přidání nového pegu</li>
              <li>3. Přetáhněte pegy na správná místa podél břehu</li>
              <li>4. Kliknutím na peg jej můžete smazat</li>
            </ul>
          </div>
        </div>

        {/* Map */}
        <div className="relative">
          <PegMap
            center={mapCenter}
            zoom={mapZoom}
            pegs={pegs}
            onCenterChange={handleCenterChange}
            onPegChange={handlePegChange}
            editable={true}
            height="500px"
            satellite={true}
          />
        </div>

        {/* Peg list */}
        {pegs.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Umístěné pegy ({pegs.length})</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {pegs.map((peg) => (
                <div
                  key={peg.id}
                  className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: peg.tymBarva || "#3B82F6" }}
                  >
                    {peg.pegCislo}
                  </div>
                  <span className="truncate">{peg.tymNazev || `Peg ${peg.pegCislo}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning if no teams with pegs */}
        {tymy.filter(t => t.peg_cislo !== null).length === 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg text-sm text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Nejprve přiřaďte čísla pegů jednotlivým týmům v sekci "Týmy"</span>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ukládání...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Uložit mapu
              </>
            )}
          </Button>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}

export default MapSettings
