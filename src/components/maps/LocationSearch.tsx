"use client"

import { useState, useCallback, useRef } from "react"
import { useJsApiLoader, Autocomplete, Libraries } from "@react-google-maps/api"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// IMPORTANT: This must be defined outside component and match PegMap.tsx
// to prevent "Loader must not be called again with different options" error
const libraries: Libraries = ["places"]

interface LocationSearchProps {
  /** Callback when location is selected */
  onLocationSelect: (location: { lat: number; lng: number; name: string }) => void
  /** Placeholder text */
  placeholder?: string
  /** Additional class names */
  className?: string
  /** Default value */
  defaultValue?: string
}

export function LocationSearch({
  onLocationSelect,
  placeholder = "Hledat rybník nebo lokalitu...",
  className,
  defaultValue = "",
}: LocationSearchProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: "cs",
    region: "CZ",
  })

  const [inputValue, setInputValue] = useState(defaultValue)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
    // Prefer Czech locations
    autocomplete.setComponentRestrictions({ country: "cz" })
  }, [])

  const onPlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return

    const place = autocompleteRef.current.getPlace()

    if (place.geometry?.location) {
      const location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        name: place.name || place.formatted_address || "",
      }

      setInputValue(location.name)
      onLocationSelect(location)
    }
  }, [onLocationSelect])

  if (!isLoaded) {
    return (
      <div className={cn("relative", className)}>
        <Input
          disabled
          placeholder="Načítání..."
          className="pl-10"
        />
        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{
          types: ["establishment", "geocode"],
          componentRestrictions: { country: "cz" },
        }}
      >
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
        />
      </Autocomplete>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  )
}

export default LocationSearch
