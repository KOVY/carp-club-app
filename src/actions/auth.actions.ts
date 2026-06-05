'use server'
// @ts-nocheck

/**
 * Authentication Server Actions
 * Requirements: 9.1, 9.2, 9.3
 * 
 * Implements:
 * - generateLoginCode(): Generate and send OTP to email
 * - verifyLoginCode(): Verify OTP and create session
 * - getUserRole(): Get user's role in a specific zavod
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import type { ActionResult, UserRole, ZavodRole, Tym, ClenTymu } from '@/lib/types'

/**
 * Generate a one-time login code and send it to the user's email
 * Requirement 9.1: Login via one-time code sent to email
 * Requirement 9.2: Generate one-time login code when organizer creates account
 */
export async function generateLoginCode(email: string): Promise<ActionResult<{ message: string }>> {
  try {
    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Neplatná emailová adresa',
        },
      }
    }

    const supabase = await createClient()

    // Use Supabase's built-in OTP (magic link) functionality
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Don't create user if they don't exist - they must be pre-registered
        shouldCreateUser: false,
      },
    })

    if (error) {
      // If user doesn't exist, return a generic message for security
      if (error.message.includes('User not found') || error.message.includes('Signups not allowed')) {
        return {
          success: false,
          error: {
            code: ErrorCodes.UNAUTHORIZED,
            message: 'Uživatel s tímto emailem není registrován',
          },
        }
      }
      
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: error.message,
        },
      }
    }

    return {
      success: true,
      data: {
        message: 'Přihlašovací kód byl odeslán na váš email',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Verify the one-time login code and create a session
 * Requirement 9.1: Login via one-time code
 */
export async function verifyLoginCode(
  email: string,
  token: string
): Promise<ActionResult<{ userId: string }>> {
  try {
    if (!email || !token) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Email a kód jsou povinné',
        },
      }
    }

    const supabase = await createClient()

    // Verify the OTP token
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Neplatný nebo expirovaný kód',
        },
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Přihlášení se nezdařilo',
        },
      }
    }

    return {
      success: true,
      data: {
        userId: data.user.id,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Get user's role in a specific zavod
 * Requirement 9.3: Store user role in profiles table
 * 
 * Role hierarchy:
 * - poradatel: Full access to zavod management
 * - rozhodci: Can confirm any catch, issue yellow cards
 * - kapitan: Can submit catches, confirm neighbor catches
 * - zavodnik: Can view team info
 * - divak: Public read-only access
 */
export async function getUserRole(
  userId: string,
  zavodId: string
): Promise<ActionResult<{ role: UserRole }>> {
  try {
    if (!userId || !zavodId) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'User ID a Závod ID jsou povinné',
        },
      }
    }

    const supabase = await createClient()

    // First check zavod_role table for explicit role assignment
    const { data: zavodRole, error: zavodRoleError } = await supabase
      .from('zavod_role')
      .select('role')
      .eq('user_id', userId)
      .eq('zavod_id', zavodId)
      .single()

    if (zavodRole && !zavodRoleError) {
      return {
        success: true,
        data: {
          role: (zavodRole as Pick<ZavodRole, 'role'>).role,
        },
      }
    }

    // If no explicit role, check if user is a team member
    // First get teams in this zavod that the user is a member of
    const { data: teams } = await supabase
      .from('tymy')
      .select('id')
      .eq('zavod_id', zavodId)

    if (teams && teams.length > 0) {
      const teamIds = (teams as Pick<Tym, 'id'>[]).map(t => t.id)
      
      const { data: clenTymu } = await supabase
        .from('clenove_tymu')
        .select('role')
        .eq('user_id', userId)
        .in('tym_id', teamIds)
        .single()

      if (clenTymu) {
        return {
          success: true,
          data: {
            role: (clenTymu as Pick<ClenTymu, 'role'>).role,
          },
        }
      }
    }

    // Default to divak (public viewer) if no role found
    return {
      success: true,
      data: {
        role: 'divak',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<ActionResult<{ 
  userId: string
  email: string
  profile?: {
    jmeno: string
    telefon: string | null
  }
}>> {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: ErrorMessages[ErrorCodes.UNAUTHORIZED],
        },
      }
    }

    // Get profile data (adminClient — telefon skryto RLS po migraci 016)
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('jmeno, telefon')
      .eq('id', user.id)
      .single()

    return {
      success: true,
      data: {
        userId: user.id,
        email: user.email || '',
        profile: profile || undefined,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Sign in with email and password (for admin)
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<ActionResult<{ userId: string }>> {
  try {
    if (!email || !password) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Email a heslo jsou povinné',
        },
      }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Neplatný email nebo heslo',
        },
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Přihlášení se nezdařilo',
        },
      }
    }

    return {
      success: true,
      data: {
        userId: data.user.id,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: error.message,
        },
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}
