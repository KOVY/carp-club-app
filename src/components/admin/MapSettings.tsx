"use client"

import { useState, useEffect, useCallback } from "react"
import { MapPin, Save, Loader2, AlertCircle, Info, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"
import { PegMap, LocationSearch, type PegLocation, type MapCenter } from "@/components/maps"
import { useToast } from "@/hooks/use-toast"
import { updateZavod } from "@/actions/admin.actions"
import { updateTymPegLocation } from "@/actions/tym.actions"
import type { Zavod, Tym } from "@/lib/types"
import { cn } from "@/lib/utils"

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

  // Pegs state - only pegs with GPS coordinates are shown on map
  const [pegs, setPegs] = useState<PegLocation[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Get all teams with peg numbers (for the list)
  const teamsWithPegs = tymy
    .filter(tym => tym.peg_cislo !== null)
    .sort((a, b) => (a.peg_cislo || 0) - (b.peg_cislo || 0))

  // Count pegs with/without GPS
  const pegsWithGps = teamsWithPegs.filter(t => t.peg_lat && t.peg_lng)
  const pegsWithoutGps = teamsWithPegs.filter(t => !t.peg_lat || !t.peg_lng)

  // Initialize pegs from teams - ONLY those with valid GPS coordinates
  useEffect(() => {
    const teamPegs: PegLocation[] = tymy
      .filter(tym => tym.peg_cislo !== null && tym.peg_lat && tym.peg_lng)
      .map(tym => ({
        id: tym.id,
        pegCislo: tym.peg_cislo!,
        lat: tym.peg_lat!,
        lng: tym.peg_lng!,
        tymNazev: tym.nazev,
        tymBarva: tym.barva || "#3B82F6",
      }))
      .sort((a, b) => a.pegCislo - b.pegCislo)

    setPegs(teamPegs)
  }, [tymy])

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

  // Handle peg changes - when a new peg is added, assign it to first team without GPS
  const handlePegChange = useCallback((updatedPegs: PegLocation[]) => {
    // Check if a new peg was added (more pegs than before)
    if (updatedPegs.length > pegs.length) {
      const newPeg = updatedPegs[updatedPegs.length - 1]

      // Find first team without GPS coordinates
      const teamWithoutGps = teamsWithPegs.find(t => !t.peg_lat || !t.peg_lng)

      if (teamWithoutGps) {
        // Assign the new location to this team
        const assignedPeg: PegLocation = {
          id: teamWithoutGps.id,
          pegCislo: teamWithoutGps.peg_cislo!,
          lat: newPeg.lat,
          lng: newPeg.lng,
          tymNazev: teamWithoutGps.nazev,
          tymBarva: teamWithoutGps.barva || "#3B82F6",
        }

        // Replace the generic new peg with the assigned one
        const correctedPegs = [...pegs, assignedPeg]
        setPegs(correctedPegs)
        setHasChanges(true)
        return
      }
    }

    setPegs(updatedPegs)
    setHasChanges(true)
  }, [pegs, teamsWithPegs])

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
            <p className="font-medium text-blue-700 dark:text-blue-300">Jak umístit pegy na břeh:</p>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              <li>1. Vyhledejte rybník pomocí pole výše</li>
              <li>2. Klikněte na břeh mapy - peg se přiřadí dalšímu týmu bez GPS</li>
              <li>3. Přetáhněte existující pegy na správná místa</li>
              <li>4. Kliknutím na peg zobrazíte detail (a můžete smazat)</li>
            </ul>
            {pegsWithoutGps.length > 0 && (
              <p className="mt-2 text-amber-600 dark:text-amber-400 font-medium">
                Zbývá umístit: {pegsWithoutGps.length} pegů
              </p>
            )}
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

        {/* Peg validation summary */}
        {teamsWithPegs.length > 0 && (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Stav pegů</span>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {pegsWithGps.length} s GPS
                </span>
                {pegsWithoutGps.length > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle className="h-4 w-4" />
                    {pegsWithoutGps.length} bez GPS
                  </span>
                )}
              </div>
            </div>

            {/* Pegs without GPS - warning section */}
            {pegsWithoutGps.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Pegy bez GPS souřadnic ({pegsWithoutGps.length})
                </label>
                <p className="text-xs text-muted-foreground">
                  Klikněte na mapu pro umístění těchto pegů na břeh
                </p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {pegsWithoutGps.map((tym) => (
                    <div
                      key={tym.id}
                      className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-60"
                        style={{ backgroundColor: tym.barva || "#EF4444" }}
                      >
                        {tym.peg_cislo}
                      </div>
                      <XCircle className="h-3 w-3 text-red-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pegs with GPS - success section */}
            {pegsWithGps.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Pegy s GPS souřadnicemi ({pegsWithGps.length})
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {pegsWithGps.map((tym) => (
                    <div
                      key={tym.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg text-sm",
                        "bg-green-500/10 border border-green-500/30"
                      )}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: tym.barva || "#3B82F6" }}
                      >
                        {tym.peg_cislo}
                      </div>
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
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
