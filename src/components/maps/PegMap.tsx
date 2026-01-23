"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api"
import { MapPin, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PegLocation {
  id: string
  pegCislo: number
  lat: number
  lng: number
  tymNazev?: string
  tymBarva?: string
}

export interface MapCenter {
  lat: number
  lng: number
}

interface PegMapProps {
  /** Center of the map */
  center?: MapCenter
  /** Zoom level */
  zoom?: number
  /** List of pegs to display */
  pegs?: PegLocation[]
  /** Callback when map center changes (for edit mode) */
  onCenterChange?: (center: MapCenter) => void
  /** Callback when peg is added/moved (for edit mode) */
  onPegChange?: (pegs: PegLocation[]) => void
  /** Enable edit mode (allows adding/moving pegs) */
  editable?: boolean
  /** Map height */
  height?: string
  /** Additional class names */
  className?: string
  /** Show satellite view */
  satellite?: boolean
}

const defaultCenter: MapCenter = {
  lat: 49.8175, // Czech Republic center
  lng: 15.4730,
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
}

// Map options for better UX
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
}

export function PegMap({
  center = defaultCenter,
  zoom = 15,
  pegs = [],
  onCenterChange,
  onPegChange,
  editable = false,
  height = "400px",
  className,
  satellite = true,
}: PegMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    language: "cs",
    region: "CZ",
  })

  const mapRef = useRef<google.maps.Map | null>(null)
  const [selectedPeg, setSelectedPeg] = useState<PegLocation | null>(null)
  const [localPegs, setLocalPegs] = useState<PegLocation[]>(pegs)

  // Sync local pegs with props
  useEffect(() => {
    setLocalPegs(pegs)
  }, [pegs])

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const onUnmount = useCallback(() => {
    mapRef.current = null
  }, [])

  // Handle map click to add new peg (in edit mode)
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!editable || !e.latLng) return

    const newPeg: PegLocation = {
      id: `peg-${Date.now()}`,
      pegCislo: localPegs.length + 1,
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    }

    const updatedPegs = [...localPegs, newPeg]
    setLocalPegs(updatedPegs)
    onPegChange?.(updatedPegs)
  }, [editable, localPegs, onPegChange])

  // Handle marker drag end (in edit mode)
  const handleMarkerDragEnd = useCallback((pegId: string, e: google.maps.MapMouseEvent) => {
    if (!editable || !e.latLng) return

    const updatedPegs = localPegs.map(peg =>
      peg.id === pegId
        ? { ...peg, lat: e.latLng!.lat(), lng: e.latLng!.lng() }
        : peg
    )
    setLocalPegs(updatedPegs)
    onPegChange?.(updatedPegs)
  }, [editable, localPegs, onPegChange])

  // Handle center change
  const handleCenterChanged = useCallback(() => {
    if (!mapRef.current || !onCenterChange) return

    const newCenter = mapRef.current.getCenter()
    if (newCenter) {
      onCenterChange({
        lat: newCenter.lat(),
        lng: newCenter.lng(),
      })
    }
  }, [onCenterChange])

  // Delete peg (in edit mode)
  const handleDeletePeg = useCallback((pegId: string) => {
    if (!editable) return

    const updatedPegs = localPegs
      .filter(peg => peg.id !== pegId)
      .map((peg, index) => ({ ...peg, pegCislo: index + 1 })) // Re-number pegs

    setLocalPegs(updatedPegs)
    onPegChange?.(updatedPegs)
    setSelectedPeg(null)
  }, [editable, localPegs, onPegChange])

  // Loading state
  if (!isLoaded) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-lg",
          className
        )}
        style={{ height }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Načítání mapy...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (loadError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-destructive/10 rounded-lg",
          className
        )}
        style={{ height }}
      >
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Nepodařilo se načíst mapu</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn("rounded-lg overflow-hidden border", className)}
      style={{ height }}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        onCenterChanged={handleCenterChanged}
        options={{
          ...mapOptions,
          mapTypeId: satellite ? "hybrid" : "roadmap",
        }}
      >
        {/* Render peg markers */}
        {localPegs.map((peg) => (
          <Marker
            key={peg.id}
            position={{ lat: peg.lat, lng: peg.lng }}
            draggable={editable}
            onDragEnd={(e) => handleMarkerDragEnd(peg.id, e)}
            onClick={() => setSelectedPeg(peg)}
            label={{
              text: String(peg.pegCislo),
              color: "white",
              fontWeight: "bold",
              fontSize: "12px",
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 16,
              fillColor: peg.tymBarva || "#3B82F6",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
            }}
          />
        ))}

        {/* Info window for selected peg */}
        {selectedPeg && (
          <InfoWindow
            position={{ lat: selectedPeg.lat, lng: selectedPeg.lng }}
            onCloseClick={() => setSelectedPeg(null)}
          >
            <div className="p-2 min-w-[120px]">
              <div className="font-bold text-lg">Peg {selectedPeg.pegCislo}</div>
              {selectedPeg.tymNazev && (
                <div className="text-sm text-gray-600 mt-1">
                  {selectedPeg.tymNazev}
                </div>
              )}
              {editable && (
                <button
                  onClick={() => handleDeletePeg(selectedPeg.id)}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                >
                  Smazat peg
                </button>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Edit mode instructions */}
      {editable && (
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm shadow-lg">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Klikněte na mapu pro přidání pegu</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PegMap
