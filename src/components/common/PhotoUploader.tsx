"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, X, Image as ImageIcon, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PhotoUploaderProps {
  onFileSelect: (file: File) => void
  onClear?: () => void
  accept?: string
  maxSizeMB?: number
  className?: string
  disabled?: boolean
  preview?: string | null
}

export function PhotoUploader({
  onFileSelect,
  onClear,
  accept = "image/*",
  maxSizeMB = 10,
  className,
  disabled = false,
  preview: externalPreview,
}: PhotoUploaderProps) {
  const [internalPreview, setInternalPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const preview = externalPreview ?? internalPreview

  const handleFile = useCallback((file: File) => {
    setError(null)

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Prosím vyberte obrázek")
      return
    }

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      setError(`Maximální velikost souboru je ${maxSizeMB} MB`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setInternalPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    onFileSelect(file)
  }, [maxSizeMB, onFileSelect])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [disabled, handleFile])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleClear = () => {
    setInternalPreview(null)
    setError(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
    onClear?.()
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {preview ? (
        <div className="relative rounded-lg overflow-hidden border">
          <img
            src={preview}
            alt="Náhled fotografie"
            className="w-full h-48 object-cover"
          />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Odstranit fotografii</span>
            </Button>
          )}
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            isDragging && "border-primary bg-primary/5",
            !isDragging && "border-muted-foreground/25 hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              Přetáhněte fotografii sem
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              nebo klikněte pro výběr
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={disabled}>
              <Upload className="h-4 w-4 mr-2" />
              Vybrat soubor
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Max. {maxSizeMB} MB • JPG, PNG, WEBP
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

interface CameraButtonProps {
  onCapture: (file: File) => void
  disabled?: boolean
  className?: string
}

export function CameraButton({ onCapture, disabled, className }: CameraButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onCapture(file)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={className}
      >
        <Camera className="h-4 w-4 mr-2" />
        Vyfotit
      </Button>
    </>
  )
}
