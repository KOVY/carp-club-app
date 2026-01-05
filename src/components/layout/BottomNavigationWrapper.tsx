"use client"

import { useEffect, useState } from "react"
import { BottomNavigation } from "./BottomNavigation"
import { usePendingConfirmations } from "@/hooks/usePendingConfirmations"
import { createClient } from "@/lib/supabase/client"

interface BottomNavigationWrapperProps {
  /** Optional závod ID for context-aware navigation */
  zavodId?: string
  /** Custom class name */
  className?: string
}

/**
 * Wrapper component for BottomNavigation that handles:
 * - Authentication state
 * - Real-time pending confirmations count
 * 
 * Requirement: 3.8 - Badge with pending confirmations count
 */
export function BottomNavigationWrapper({
  zavodId,
  className,
}: BottomNavigationWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Get pending confirmations count with real-time updates
  const { count: pendingCount } = usePendingConfirmations({
    zavodId: zavodId || '',
    enabled: !!zavodId && isAuthenticated,
  })

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
      setIsLoading(false)
    }

    checkAuth()

    // Subscribe to auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(!!session?.user)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (isLoading) {
    return null // Don't render until we know auth state
  }

  return (
    <BottomNavigation
      zavodId={zavodId}
      pendingCount={pendingCount}
      isAuthenticated={isAuthenticated}
      className={className}
    />
  )
}

export default BottomNavigationWrapper
