"use client"

import { useState, createContext, useContext, useCallback } from "react"
import Link from "next/link"
import { LogIn, UserPlus, Fish, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * DemoLoginPrompt - Friendly login prompt for demo závod
 * 
 * Shows a welcoming dialog when users try to perform protected actions
 * in the demo závod, encouraging them to register.
 * 
 * Requirements: 5.7
 */

interface DemoLoginPromptContextType {
  showLoginPrompt: (action?: string) => void
}

const DemoLoginPromptContext = createContext<DemoLoginPromptContextType | null>(null)

export function useDemoLoginPrompt() {
  const context = useContext(DemoLoginPromptContext)
  if (!context) {
    throw new Error("useDemoLoginPrompt must be used within DemoLoginPromptProvider")
  }
  return context
}

interface DemoLoginPromptProviderProps {
  children: React.ReactNode
}

export function DemoLoginPromptProvider({ children }: DemoLoginPromptProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [actionDescription, setActionDescription] = useState<string | undefined>()

  const showLoginPrompt = useCallback((action?: string) => {
    setActionDescription(action)
    setIsOpen(true)
  }, [])

  return (
    <DemoLoginPromptContext.Provider value={{ showLoginPrompt }}>
      {children}
      <DemoLoginPromptDialog 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        actionDescription={actionDescription}
      />
    </DemoLoginPromptContext.Provider>
  )
}

interface DemoLoginPromptDialogProps {
  isOpen: boolean
  onClose: () => void
  actionDescription?: string
}

function DemoLoginPromptDialog({ isOpen, onClose, actionDescription }: DemoLoginPromptDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Fish className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              Připojte se k Carp Club ČR
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {actionDescription ? (
              <>
                Pro <span className="font-medium text-foreground">{actionDescription}</span> je potřeba být přihlášen.
              </>
            ) : (
              "Tato akce vyžaduje přihlášení."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Benefits list */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Účast v závodech</p>
                <p className="text-sm text-muted-foreground">
                  Zaznamenávejte úlovky a sledujte své výsledky v reálném čase
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Potvrzování úlovků</p>
                <p className="text-sm text-muted-foreground">
                  Pomáhejte ověřovat úlovky sousedních týmů
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Kompletní statistiky</p>
                <p className="text-sm text-muted-foreground">
                  Přístup k historii závodů a osobním statistikám
                </p>
              </div>
            </div>
          </div>

          {/* Demo note */}
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-sm text-purple-700">
              <span className="font-medium">Tip:</span> Právě prohlížíte ukázkový závod. 
              Po přihlášení získáte přístup ke všem funkcím v reálných závodech.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Pokračovat v prohlížení
          </Button>
          <Link href="/login" className="w-full sm:w-auto">
            <Button className="w-full gap-2">
              <LogIn className="h-4 w-4" />
              Přihlásit se
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * DemoProtectedButton - Button that shows login prompt when clicked in demo
 * 
 * Use this for any action that requires authentication in the demo závod.
 */
interface DemoProtectedButtonProps {
  children: React.ReactNode
  actionDescription?: string
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  disabled?: boolean
}

export function DemoProtectedButton({
  children,
  actionDescription,
  className,
  variant = "default",
  size = "default",
  disabled = false,
}: DemoProtectedButtonProps) {
  const { showLoginPrompt } = useDemoLoginPrompt()

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={() => showLoginPrompt(actionDescription)}
    >
      {children}
    </Button>
  )
}
