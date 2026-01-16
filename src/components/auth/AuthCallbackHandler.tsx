"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AuthCallbackHandlerProps {
  /** URL to redirect to after successful auth (without hash) */
  redirectTo?: string
}

/**
 * Client component that handles magic link tokens from URL hash.
 *
 * When Supabase sends a magic link, the token is in the URL hash fragment
 * (e.g., #access_token=...). This component:
 * 1. Detects the hash fragment
 * 2. Exchanges it for a session
 * 3. Redirects to clean URL
 * 4. Triggers page refresh to load user data
 */
export function AuthCallbackHandler({ redirectTo }: AuthCallbackHandlerProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check if we have a hash fragment with access_token
      if (typeof window === 'undefined') return

      const hash = window.location.hash
      if (!hash || !hash.includes('access_token=')) return

      setIsProcessing(true)
      console.log('AuthCallbackHandler: Processing magic link token...')

      try {
        const supabase = createClient()

        // Supabase client should automatically handle the hash fragment
        // but we need to ensure the session is established
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('AuthCallbackHandler: Error getting session:', error)
          setIsProcessing(false)
          return
        }

        if (session) {
          console.log('AuthCallbackHandler: Session established for:', session.user.email)

          // Remove the hash fragment from URL (clean URL)
          const cleanUrl = window.location.pathname + window.location.search

          // Use replaceState to clean URL without navigation
          window.history.replaceState(null, '', cleanUrl)

          // Force a full page reload to ensure server components get the session
          // This is necessary because server components read from cookies
          // which are set by Supabase after session establishment
          window.location.reload()
        } else {
          console.log('AuthCallbackHandler: No session established')
          setIsProcessing(false)
        }
      } catch (err) {
        console.error('AuthCallbackHandler: Unexpected error:', err)
        setIsProcessing(false)
      }
    }

    handleAuthCallback()
  }, [router, redirectTo])

  // Show loading indicator while processing
  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Přihlašování...</p>
        </div>
      </div>
    )
  }

  return null
}
