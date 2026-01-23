"use client"

import { createContext, useContext, ReactNode } from "react"
import { useJsApiLoader, Libraries } from "@react-google-maps/api"

// All libraries needed across the app - MUST be defined outside component to prevent re-renders
const libraries: Libraries = ["places"]

interface GoogleMapsContextType {
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
})

interface GoogleMapsProviderProps {
  children: ReactNode
}

/**
 * GoogleMapsProvider - Singleton provider for Google Maps API
 *
 * This provider ensures the Google Maps API is loaded only once with all
 * required libraries. Use this at the app level to avoid conflicts.
 */
export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: "cs",
    region: "CZ",
  })

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

/**
 * Hook to access Google Maps loading state
 */
export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext)
  return context
}
