"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Fish, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { PhotoUploader, CameraButton } from "@/components/common/PhotoUploader"
import { useToast } from "@/hooks/use-toast"
import { triggerHaptic } from "@/hooks/useHapticFeedback"
import { submitUlovek } from "@/actions/ulovky.actions"
import { MIN_VAHA_KG, DRUHY_RYB } from "@/lib/constants"

// Form validation schema
const ulovekFormSchema = z.object({
  vaha: z
    .number({ message: "Váha je povinná" })
    .min(MIN_VAHA_KG, `Minimální váha ryby je ${MIN_VAHA_KG} kg`),
  druh: z.enum(DRUHY_RYB, {
    message: "Vyberte druh ryby",
  }),
})

type UlovekFormValues = z.infer<typeof ulovekFormSchema>

interface UlovekFormProps {
  zavodId: string
  onSuccess?: () => void
  disabled?: boolean
}

/**
 * UlovekForm - Form for submitting a new catch (úlovek)
 * 
 * Requirements:
 * - 3.1: Create catch with weight, type, photo, timestamp
 * - 3.2: Validate weight >= 5kg
 * - 3.5: Photo is required
 */
export function UlovekForm({ zavodId, onSuccess, disabled = false }: UlovekFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const { toast } = useToast()

  const form = useForm<UlovekFormValues>({
    resolver: zodResolver(ulovekFormSchema),
    defaultValues: {
      vaha: undefined,
      druh: undefined,
    },
  })

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleClearPhoto = () => {
    setSelectedFile(null)
    setPhotoPreview(null)
  }

  const onSubmit = async (values: UlovekFormValues) => {
    // Validate photo is selected
    if (!selectedFile) {
      toast({
        title: "Chyba",
        description: "Fotografie je povinná",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitUlovek({
        zavodId,
        vaha: values.vaha,
        druh: values.druh,
        fotoFile: selectedFile,
      })

      if (result.success) {
        // Trigger haptic feedback on success (Requirement 3.7)
        triggerHaptic('success')
        
        toast({
          title: "Úlovek zaznamenán",
          description: "Váš úlovek byl úspěšně zaznamenán a čeká na potvrzení.",
        })
        
        // Reset form
        form.reset()
        handleClearPhoto()
        
        onSuccess?.()
      } else {
        toast({
          title: "Chyba",
          description: result.error?.message || "Nepodařilo se zaznamenat úlovek",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nastala neočekávaná chyba",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2">
          <Fish className="h-5 w-5" />
          Nový úlovek
        </GlassCardTitle>
        <GlassCardDescription>
          Zaznamenejte nový úlovek. Minimální váha je {MIN_VAHA_KG} kg.
        </GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Weight field */}
            <FormField
              control={form.control}
              name="vaha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Váha (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={MIN_VAHA_KG}
                      placeholder={`Min. ${MIN_VAHA_KG} kg`}
                      disabled={disabled || isSubmitting}
                      autoComplete="off"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      value={field.value ?? ""}
                      className="text-[16px] sm:text-sm"
                    />
                  </FormControl>
                  <FormDescription>
                    Zadejte váhu ryby v kilogramech
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fish type field */}
            <FormField
              control={form.control}
              name="druh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Druh ryby</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={field.value === "kapr" ? "default" : "outline"}
                        className="flex-1"
                        disabled={disabled || isSubmitting}
                        onClick={() => field.onChange("kapr")}
                      >
                        🐟 Kapr
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "amur" ? "default" : "outline"}
                        className="flex-1"
                        disabled={disabled || isSubmitting}
                        onClick={() => field.onChange("amur")}
                      >
                        🐠 Amur
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo upload */}
            <div className="space-y-2">
              <Label>Fotografie *</Label>
              <div className="flex gap-2 mb-2">
                <CameraButton
                  onCapture={handleFileSelect}
                  disabled={disabled || isSubmitting}
                  className="flex-1"
                />
              </div>
              <PhotoUploader
                onFileSelect={handleFileSelect}
                onClear={handleClearPhoto}
                preview={photoPreview}
                disabled={disabled || isSubmitting}
                maxSizeMB={10}
              />
              {!selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Fotografie úlovku je povinná
                </p>
              )}
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full"
              disabled={disabled || isSubmitting || !selectedFile}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Odesílám...
                </>
              ) : (
                <>
                  <Fish className="mr-2 h-4 w-4" />
                  Zaznamenat úlovek
                </>
              )}
            </Button>
          </form>
        </Form>
      </GlassCardContent>
    </GlassCard>
  )
}
