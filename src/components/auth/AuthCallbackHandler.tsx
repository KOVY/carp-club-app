"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Client component that handles magic link tokens from URL hash.
 */
export function AuthCallbackHandler() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (typeof window === 'undefined') return

      const hash = window.location.hash
      if (!hash || !hash.includes('access_token=')) return

      // Prevent double processing
      if (isProcessing) return
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

        // Set session with tokens
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        console.log('AuthCallbackHandler: setSession result:', {
          hasSession: !!data?.session,
          error: sessionError?.message
        })

        if (sessionError) {
          console.error('AuthCallbackHandler: setSession error:', sessionError)
          setError(`Chyba přihlášení: ${sessionError.message}`)
          setIsProcessing(false)

          // Clean URL even on error
          const cleanUrl = window.location.pathname + window.location.search
          window.history.replaceState(null, '', cleanUrl)
          return
        }

        if (data?.session) {
          console.log('AuthCallbackHandler: Success! User:', data.session.user.email)

          // Clean URL
          const cleanUrl = window.location.pathname + window.location.search
          window.history.replaceState(null, '', cleanUrl)

          // Short delay then reload
          setTimeout(() => {
            window.location.reload()
          }, 100)
        } else {
          setError('Session nebyla vytvořena')
          setIsProcessing(false)
        }
      } catch (err) {
        console.error('AuthCallbackHandler: Exception:', err)
        setError(`Neočekávaná chyba: ${err}`)
        setIsProcessing(false)
      }
    }

    // Small delay to ensure component is mounted
    const timer = setTimeout(handleAuthCallback, 50)
    return () => clearTimeout(timer)
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
