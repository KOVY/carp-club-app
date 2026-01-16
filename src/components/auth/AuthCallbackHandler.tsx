"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Client component that handles magic link tokens from URL hash.
 *
 * When Supabase sends a magic link, the token is in the URL hash fragment
 * (e.g., #access_token=...). This component:
 * 1. Detects the hash fragment
 * 2. Parses tokens and sets the session
 * 3. Cleans URL and reloads page
 */
export function AuthCallbackHandler() {
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (typeof window === 'undefined') return

      const hash = window.location.hash
      if (!hash || !hash.includes('access_token=')) return

      setIsProcessing(true)
      console.log('AuthCallbackHandler: Processing magic link token...')

      try {
        // Parse tokens from hash fragment
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (!accessToken || !refreshToken) {
          console.error('AuthCallbackHandler: Missing tokens in hash')
          setIsProcessing(false)
          return
        }

        const supabase = createClient()

        // Set the session using the tokens from URL
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          console.error('AuthCallbackHandler: Error setting session:', error)
          setIsProcessing(false)
          return
        }

        if (data.session) {
          console.log('AuthCallbackHandler: Session established for:', data.session.user.email)

          // Clean URL by removing hash fragment
          const cleanUrl = window.location.pathname + window.location.search
          window.history.replaceState(null, '', cleanUrl)

          // Reload to refresh server components with new session
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
  }, [])

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
