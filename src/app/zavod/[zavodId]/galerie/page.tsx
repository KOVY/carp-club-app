"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { Camera, Filter, RefreshCw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"
import { Label } from "@/components/ui/label"
import { SkeletonLoader } from "@/components/ui/SkeletonLoader"
import { ErrorState } from "@/components/common/ErrorState"
import { StatusMessage } from "@/components/common/StatusMessage"
import { getUlovkyByZavod } from "@/actions/ulovky.actions"
import { DRUHY_RYB } from "@/lib/constants"
import type { UlovekWithRelations, Tym } from "@/lib/types"

/**
 * Gallery Page - Photo gallery of all confirmed catches
 * 
 * Requirements:
 * - 10.1: Display photo gallery of all confirmed catches in the competition
 * - 10.4: Allow filtering gallery by team and fish type
 */
export default function GaleriePage() {
  const params = useParams()
  const zavodId = params.zavodId as string

  const [ulovky, setUlovky] = useState<UlovekWithRelations[]>([])
  const [tymy, setTymy] = useState<Tym[]>([])
  const [embargoActive, setEmbargoActive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [selectedTym, setSelectedTym] = useState<string>("")
  const [selectedDruh, setSelectedDruh] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)
  
  // Lightbox state
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const result = await getUlovkyByZavod(zavodId)
      
      if (result.success && result.data) {
        // Only show confirmed catches in gallery (Requirement 10.1)
        const confirmedUlovky = result.data.ulovky.filter(u => u.stav === 'potvrzeno')
        setUlovky(confirmedUlovky)
        setEmbargoActive(result.data.embargoActive)
        
        // Extract unique teams from catches
        const uniqueTymy = confirmedUlovky
          .map(u => u.tym)
          .filter((tym): tym is Tym => tym !== undefined)
          .filter((tym, index, self) => 
            index === self.findIndex(t => t.id === tym.id)
          )
        setTymy(uniqueTymy)
      } else {
        setError(result.error?.message || "Nepodařilo se načíst galerii")
      }
    } catch (err) {
      setError("Nepodařilo se načíst data")
      console.error("Error fetching gallery data:", err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [zavodId])

  const handleRefresh = () => {
    fetchData(true)
  }

  const clearFilters = () => {
    setSelectedTym("")
    setSelectedDruh("")
  }

  // Filter catches based on selected filters (Requirement 10.4)
  const filteredUlovky = useMemo(() => {
    return ulovky.filter(u => {
      // Filter by team
      if (selectedTym && u.tym_id !== selectedTym) {
        return false
      }
      // Filter by fish type
      if (selectedDruh && u.druh !== selectedDruh) {
        return false
      }
      return true
    })
  }, [ulovky, selectedTym, selectedDruh])

  // Lightbox navigation handlers (Requirement 8.2 - swipe gestures)
  const selectedImage = selectedImageIndex !== null ? filteredUlovky[selectedImageIndex] : null

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index)
  }

  const handlePreviousImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1)
    }
  }

  const handleNextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < filteredUlovky.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1)
    }
  }

  const handleCloseLightbox = () => {
    setSelectedImageIndex(null)
  }

  const hasActiveFilters = selectedTym || selectedDruh

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Camera className="h-6 w-6" />
              Fotogalerie
            </h1>
            <p className="text-muted-foreground">Načítání...</p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" height={150} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => fetchData()} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6" />
            Fotogalerie
          </h1>
          <p className="text-muted-foreground">
            {filteredUlovky.length} {filteredUlovky.length === 1 ? 'úlovek' : 
              filteredUlovky.length >= 2 && filteredUlovky.length <= 4 ? 'úlovky' : 'úlovků'}
            {hasActiveFilters && ' (filtrováno)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtry
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {(selectedTym ? 1 : 0) + (selectedDruh ? 1 : 0)}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Obnovit
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <GlassCard>
          <GlassCardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <GlassCardTitle className="text-base">Filtry</GlassCardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1">
                  <X className="h-3 w-3" />
                  Zrušit filtry
                </Button>
              )}
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Team filter */}
              <div className="space-y-2">
                <Label htmlFor="tym-filter">Tým</Label>
                <select
                  id="tym-filter"
                  value={selectedTym}
                  onChange={(e) => setSelectedTym(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Všechny týmy</option>
                  {tymy.map(tym => (
                    <option key={tym.id} value={tym.id}>
                      {tym.nazev} {tym.peg_cislo ? `(Peg ${tym.peg_cislo})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fish type filter */}
              <div className="space-y-2">
                <Label htmlFor="druh-filter">Druh ryby</Label>
                <select
                  id="druh-filter"
                  value={selectedDruh}
                  onChange={(e) => setSelectedDruh(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Všechny druhy</option>
                  {DRUHY_RYB.map(druh => (
                    <option key={druh} value={druh}>
                      {druh === 'kapr' ? 'Kapr' : 'Amur'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Embargo warning */}
      {embargoActive && (
        <StatusMessage 
          variant="embargo" 
          title="Embargo je aktivní"
          description="Váhy úlovků jsou skryté. Plné informace budou zobrazeny po skončení závodu."
        />
      )}

      {/* Gallery grid */}
      {filteredUlovky.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="relative w-48 h-48 mx-auto mb-6 rounded-lg overflow-hidden opacity-70">
            <Image
              src="/images/empty-gallery.png"
              alt="Rybářské vybavení"
              fill
              className="object-cover"
            />
          </div>
          {hasActiveFilters ? (
            <>
              <p className="text-lg font-medium">Žádné úlovky neodpovídají zvoleným filtrům</p>
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Zrušit filtry
              </Button>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">Zatím nejsou žádné potvrzené úlovky</p>
              <p className="text-sm mt-1">Úlovky se zde objeví po potvrzení sousedními pegy</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredUlovky.map((ulovek, index) => (
            <GalleryCard
              key={ulovek.id}
              ulovek={ulovek}
              embargoActive={embargoActive}
              onClick={() => handleImageClick(index)}
            />
          ))}
        </div>
      )}

      {/* Lightbox with swipe navigation */}
      {selectedImage && (
        <ImageLightbox
          ulovek={selectedImage}
          embargoActive={embargoActive}
          onClose={handleCloseLightbox}
          onPrevious={handlePreviousImage}
          onNext={handleNextImage}
          hasPrevious={selectedImageIndex !== null && selectedImageIndex > 0}
          hasNext={selectedImageIndex !== null && selectedImageIndex < filteredUlovky.length - 1}
        />
      )}
    </div>
  )
}


// Gallery card component
interface GalleryCardProps {
  ulovek: UlovekWithRelations
  embargoActive: boolean
  onClick: () => void
}

function GalleryCard({ ulovek, embargoActive, onClick }: GalleryCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {/* Image with lazy loading (Requirement 10.5) */}
      <Image
        src={ulovek.foto_url}
        alt={`${ulovek.druh} - ${ulovek.tym?.nazev || 'Neznámý tým'}`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
        className="object-cover transition-transform group-hover:scale-105"
        loading="lazy"
      />
      
      {/* Overlay with info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-xs">
          <p className="font-medium truncate">{ulovek.tym?.nazev || 'Neznámý tým'}</p>
          <p className="opacity-90">
            {ulovek.druh === 'kapr' ? 'Kapr' : 'Amur'}
            {!embargoActive && ` • ${ulovek.vaha} kg`}
          </p>
        </div>
      </div>

      {/* Fish type badge */}
      <div className="absolute top-2 left-2">
        <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
          ulovek.druh === 'kapr' 
            ? 'bg-blue-500/90 text-white' 
            : 'bg-green-500/90 text-white'
        }`}>
          {ulovek.druh === 'kapr' ? 'K' : 'A'}
        </span>
      </div>
    </button>
  )
}

// Lightbox component for full-size image view with swipe navigation
interface ImageLightboxProps {
  ulovek: UlovekWithRelations
  embargoActive: boolean
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

function ImageLightbox({ 
  ulovek, 
  embargoActive, 
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: ImageLightboxProps) {
  const formattedDate = new Date(ulovek.cas).toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Swipe gesture handlers for gallery navigation (Requirement 8.2)
  const handleTouchStart = useRef<{ x: number; y: number } | null>(null)
  
  const onTouchStart = (e: React.TouchEvent) => {
    handleTouchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }
  }
  
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!handleTouchStart.current) return
    
    const deltaX = e.changedTouches[0].clientX - handleTouchStart.current.x
    const deltaY = e.changedTouches[0].clientY - handleTouchStart.current.y
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    
    // Only trigger horizontal swipes, threshold 50px
    if (absX > 50 && absX > absY) {
      if (deltaX > 0 && hasPrevious) {
        onPrevious?.()
      } else if (deltaX < 0 && hasNext) {
        onNext?.()
      }
    }
    
    handleTouchStart.current = null
  }

  // Close on escape key, navigate with arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && hasPrevious) {
        onPrevious?.()
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNext?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onPrevious, onNext, hasPrevious, hasNext])

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
        aria-label="Zavřít"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation arrows for desktop */}
      {hasPrevious && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrevious?.() }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white transition-colors z-10 hidden sm:block"
          aria-label="Předchozí"
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext?.() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white transition-colors z-10 hidden sm:block"
          aria-label="Další"
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Content with swipe support */}
      <div 
        className="relative max-w-4xl max-h-[90vh] w-full flex flex-col touch-pan-y"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Image */}
        <div className="relative flex-1 min-h-0">
          <Image
            src={ulovek.foto_url}
            alt={`${ulovek.druh} - ${ulovek.tym?.nazev || 'Neznámý tým'}`}
            fill
            sizes="(max-width: 1024px) 100vw, 80vw"
            className="object-contain"
            priority
          />
        </div>

        {/* Swipe hint for mobile */}
        {(hasPrevious || hasNext) && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/50 text-xs sm:hidden">
            Přejeďte pro další fotky
          </div>
        )}

        {/* Info panel */}
        <div className="bg-black/50 backdrop-blur-sm text-white p-4 rounded-b-lg mt-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">
                {ulovek.tym?.nazev || 'Neznámý tým'}
                {ulovek.tym?.peg_cislo && (
                  <span className="text-white/70 font-normal ml-2">
                    Peg {ulovek.tym.peg_cislo}
                  </span>
                )}
              </h3>
              <p className="text-white/80 text-sm mt-1">
                {ulovek.chytil?.jmeno && `Chytil: ${ulovek.chytil.jmeno}`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                {ulovek.druh === 'kapr' ? 'Kapr' : 'Amur'}
                {!embargoActive && (
                  <span className="text-2xl ml-2">{ulovek.vaha} kg</span>
                )}
              </p>
              <p className="text-white/70 text-sm mt-1">{formattedDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
