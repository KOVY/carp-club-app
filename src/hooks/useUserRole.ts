'use client'

/**
 * useUserRole Hook
 * Requirement: 8.1
 * 
 * Fetches and caches the current user's role in a specific zavod.
 * 
 * Role hierarchy:
 * - poradatel: Full access to zavod management
 * - rozhodci: Can confirm any catch, issue yellow cards
 * - kapitan: Can submit catches, confirm neighbor catches
 * - zavodnik: Can view team info
 * - divak: Public read-only access (default)
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserRoleInZavod } from '@/actions/ulovky.actions'
import type { UserRole } from '@/lib/types'

export interface UseUserRoleOptions {
  zavodId: string
  /** Enable/disable fetching */
  enabled?: boolean
}

export interface UseUserRoleReturn {
  /** User's role in the zavod */
  role: UserRole | null
  /** User's ID if authenticated */
  userId: string | null
  /** User's team ID if they belong to a team */
  tymId: string | null
  /** User's peg number if assigned */
  pegCislo: number | null
  /** Loading state */
  isLoading: boolean
  /** Error if any */
  error: Error | null
  /** Refetch the role */
  refetch: () => Promise<void>
  /** Check if user has at least the specified role level */
  hasRole: (minRole: UserRole) => boolean
  /** Check if user can submit catches */
  canSubmitUlovek: boolean
  /** Check if user can confirm catches */
  canConfirmUlovek: boolean
  /** Check if user can issue yellow cards */
  canIssueYellowCard: boolean
  /** Check if user can manage zavod */
  canManageZavod: boolean
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<UserRole, number> = {
  divak: 0,
  zavodnik: 1,
  kapitan: 2,
  rozhodci: 3,
  poradatel: 4,
  hlavni_admin: 5,
}

export function useUserRole({
  zavodId,
  enabled = true,
}: UseUserRoleOptions): UseUserRoleReturn {
  const [role, setRole] = useState<UserRole | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [tymId, setTymId] = useState<string | null>(null)
  const [pegCislo, setPegCislo] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchRole = useCallback(async () => {
    if (!zavodId || !enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        // Not authenticated - default to divak
        setRole('divak')
        setUserId(null)
        setTymId(null)
        setPegCislo(null)
        setIsLoading(false)
        return
      }

      setUserId(user.id)

      // Use server action to get role (bypasses RLS)
      const roleResult = await getUserRoleInZavod(zavodId)

      if (roleResult.success && roleResult.data?.role) {
        setRole(roleResult.data.role)
        setTymId(roleResult.data.tymId)
        // TODO: Get peg number if needed
        setPegCislo(null)
      } else {
        // Default to divak
        setRole('divak')
        setTymId(null)
        setPegCislo(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user role'))
      setRole('divak')
    } finally {
      setIsLoading(false)
    }
  }, [zavodId, enabled])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchRole()
  }, [fetchRole])

  // Helper to check role hierarchy
  const hasRole = useCallback(
    (minRole: UserRole): boolean => {
      if (!role) return false
      return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
    },
    [role]
  )

  // Permission checks based on role
  const canSubmitUlovek = role === 'zavodnik' || role === 'kapitan' || role === 'rozhodci' || role === 'poradatel'
  const canConfirmUlovek = role === 'kapitan' || role === 'rozhodci' || role === 'poradatel'
  const canIssueYellowCard = role === 'rozhodci' || role === 'poradatel'
  const canManageZavod = role === 'poradatel'

  return {
    role,
    userId,
    tymId,
    pegCislo,
    isLoading,
    error,
    refetch: fetchRole,
    hasRole,
    canSubmitUlovek,
    canConfirmUlovek,
    canIssueYellowCard,
    canManageZavod,
  }
}

export default useUserRole
