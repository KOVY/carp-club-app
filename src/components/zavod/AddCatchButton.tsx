"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

interface AddCatchButtonProps {
  zavodId: string
  zavodStav: string
  /** Server-side determined role (may be null if hash token not processed) */
  serverUserRole?: UserRole | null
}

/**
 * Client-side button for adding catches.
 * This component handles the case where the server couldn't determine the user role
 * because the auth token was in the URL hash (which server doesn't see).
 */
export function AddCatchButton({ zavodId, zavodStav, serverUserRole }: AddCatchButtonProps) {
  const [userRole, setUserRole] = useState<UserRole | null>(serverUserRole || null)
  const [isLoading, setIsLoading] = useState(!serverUserRole)

  useEffect(() => {
    // If server already determined the role, no need to fetch again
    if (serverUserRole) {
      setUserRole(serverUserRole)
      setIsLoading(false)
      return
    }

    const fetchRole = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: roleData } = await supabase
          .from('zavod_role')
          .select('role')
          .eq('user_id', user.id)
          .eq('zavod_id', zavodId)
          .single()

        if (roleData) {
          setUserRole((roleData as { role: UserRole }).role)
        }
      }

      setIsLoading(false)
    }

    fetchRole()

    // Also listen for auth state changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          fetchRole()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [zavodId, serverUserRole])

  // Don't show if zavod is not active
  if (zavodStav !== 'probiha') {
    return null
  }

  // Show loading state briefly
  if (isLoading) {
    return null
  }

  // Check if user can add catches
  const canAddCatch = userRole && ['zavodnik', 'kapitan', 'rozhodci', 'poradatel'].includes(userRole)

  if (!canAddCatch) {
    return null
  }

  return (
    <Button asChild size="lg" className="bg-accent hover:bg-accent/90">
      <Link href={`/zavod/${zavodId}/ulovky`}>
        <Plus className="h-5 w-5 mr-2" />
        Přidat úlovek
      </Link>
    </Button>
  )
}
