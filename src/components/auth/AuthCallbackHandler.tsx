"use client"

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Client component that handles magic link tokens from URL hash.
 */
export function AuthCallbackHandler() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (typeof window === 'undefined') return

      const hash = window.location.hash
      if (!hash || !hash.includes('access_token=')) return

      // Prevent double processing using ref (survives re-renders)
      if (processingRef.current) {
        console.log('AuthCallbackHandler: Already processing, skipping...')
        return
      }
      processingRef.current = true
      setIsProcessing(true)
      setError(null)

      console.log('AuthCallbackHandler: Starting...')

      try {
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        console.log('AuthCallbackHandler: Tokens found:', {
          hasAccess: !!accessToken,
          hasRefresh: !!refreshToken
        })

        if (!accessToken || !refreshToken) {
          setError('Chybějící tokeny v URL')
          setIsProcessing(false)
          return
        }

        const supabase = createClient()
        console.log('AuthCallbackHandler: Calling setSession...')

        // Clean URL FIRST before anything else to prevent re-processing
        const cleanUrl = window.location.pathname + window.location.search
        window.history.replaceState(null, '', cleanUrl)
        console.log('AuthCallbackHandler: URL cleaned')

        // Set session with tokens
        // Use try-catch with timeout to prevent hanging
        try {
          const sessionPromise = supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          // Add timeout of 5 seconds
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Session timeout')), 5000)
          })

          const { data, error: sessionError } = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]) as Awaited<typeof sessionPromise>

          console.log('AuthCallbackHandler: setSession result:', {
            hasSession: !!data?.session,
            error: sessionError?.message
          })

          if (sessionError) {
            console.error('AuthCallbackHandler: setSession error:', sessionError)
            // Don't show error, just reload - session might still be set via onAuthStateChange
          }

          if (data?.session) {
            console.log('AuthCallbackHandler: Session established successfully')
          }
        } catch (timeoutErr) {
          console.log('AuthCallbackHandler: Session call timed out, reloading anyway')
        }

        // Always reload to apply session
        console.log('AuthCallbackHandler: Reloading page...')
        window.location.reload()
      } catch (err) {
        console.error('AuthCallbackHandler: Exception:', err)
        setError(`Neočekávaná chyba: ${err}`)
        setIsProcessing(false)
        processingRef.current = false
      }
    }

    // Start processing immediately
    handleAuthCallback()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-background border rounded-lg shadow-lg">
          <p className="text-destructive font-medium mb-2">Chyba přihlášení</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.href = window.location.pathname}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Zkusit znovu
          </button>
        </div>
      </div>
    )
  }

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
