'use server'
// @ts-nocheck

/**
 * Admin Server Actions
 * 
 * Requirements:
 * - 1.1: Create competition with name, dates, rules, embargo time
 * - 1.6: Log changes to audit log when updating competition
 * - 2.1: Create team with captain and members
 * - 2.2: Random peg assignment
 * - 2.3: Ensure peg uniqueness
 * - 2.5: Generate QR code for payment with unique variable symbol
 * - 6.1: Set embargo time
 * - 7.1: Issue yellow card with reason and time
 * - 7.2: Only rozhodci/poradatel can issue yellow cards
 * - 7.3: Trigger automatically zeros score on 2nd yellow card
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'

// Hardcoded admin user ID (prorybolov@gmail.com)
const ADMIN_USER_ID = 'adfa3aa5-9e63-4a0b-8dac-f1f5911bcf25'
import { canManageZavod, canIssueYellowCard } from '@/lib/permissions'
import type { 
  ActionResult, 
  CreateZavodInput,
  UpdateZavodInput,
  CreateTymInput,
  ZlutaKartaInput,
  PermissionContext,
  Zavod,
  Tym,
  ZavodRole
} from '@/lib/types'

/**
 * Create a new competition (závod)
 * 
 * Requirement 1.1: Create competition with name, start date, end date, rules, and embargo time
 * Only poradatel can create competitions
 */
export async function createZavod(input: CreateZavodInput): Promise<ActionResult<{ zavodId: string }>> {
  try {
    const supabase = await createClient()
    
    // Get current user
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

    // Validate input
    const { nazev, misto, datum_start, datum_end, embargo_od, pravidla, soutez_id } = input

    if (!nazev || nazev.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Název závodu je povinný',
        },
      }
    }

    // Validate dates
    const startDate = new Date(datum_start)
    const endDate = new Date(datum_end)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Neplatné datum',
        },
      }
    }

    if (endDate <= startDate) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Datum konce musí být po datu začátku',
        },
      }
    }

    // Validate embargo if provided
    if (embargo_od) {
      const embargoDate = new Date(embargo_od)
      if (isNaN(embargoDate.getTime())) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Neplatné datum embarga',
          },
        }
      }
      if (embargoDate < startDate || embargoDate > endDate) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Embargo musí být v rozmezí závodu',
          },
        }
      }
    }

    // Insert the competition
    const insertData = {
      nazev: nazev.trim(),
      misto: misto?.trim() || null,
      datum_start,
      datum_end,
      embargo_od: embargo_od || null,
      pravidla: pravidla || null,
      soutez_id: soutez_id || null,
      stav: 'priprava',
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: zavod, error: insertError } = await (supabase
      .from('zavody') as any)
      .insert(insertData)
      .select('id')
      .single()

    if (insertError || !zavod) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: insertError?.message },
        },
      }
    }

    const zavodId = (zavod as { id: string }).id

    // Assign the creator as poradatel for this competition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: roleError } = await (supabase
      .from('zavod_role') as any)
      .insert({
        zavod_id: zavodId,
        user_id: user.id,
        role: 'poradatel',
      })

    if (roleError) {
      // If role assignment fails, we should still return success
      // but log the error (the zavod was created)
      console.error('Failed to assign poradatel role:', roleError)
    }

    return {
      success: true,
      data: {
        zavodId,
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
 * Update an existing competition (závod)
 * 
 * Requirement 1.6: Log changes to audit log when updating competition
 * Only poradatel can update competitions
 * Audit log is automatically handled by database trigger
 */
export async function updateZavod(
  zavodId: string,
  input: UpdateZavodInput
): Promise<ActionResult<{ zavod: Zavod }>> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user
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

    // Check hardcoded admin first
    let hasAccess = false
    if (user.id === ADMIN_USER_ID) {
      hasAccess = true
    }

    // Check system_admins table
    if (!hasAccess) {
      const { data: sysAdmin } = await adminClient
        .from('system_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (sysAdmin) {
        hasAccess = true
      }
    }

    // Check zavod_role if not system admin
    if (!hasAccess) {
      const { data: zavodRole } = await adminClient
        .from('zavod_role')
        .select('role')
        .eq('user_id', user.id)
        .eq('zavod_id', zavodId)
        .single()

      if (zavodRole) {
        const permissionCtx: PermissionContext = {
          userId: user.id,
          role: (zavodRole as Pick<ZavodRole, 'role'>).role,
          zavodId,
        }
        hasAccess = canManageZavod(permissionCtx)
      }
    }

    if (!hasAccess) {
      return {
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: ErrorMessages[ErrorCodes.FORBIDDEN],
        },
      }
    }

    // Get current zavod to validate updates
    const { data: currentZavod, error: getError } = await adminClient
      .from('zavody')
      .select('*')
      .eq('id', zavodId)
      .single()

    if (getError || !currentZavod) {
      return {
        success: false,
        error: {
          code: ErrorCodes.ZAVOD_NOT_FOUND,
          message: ErrorMessages[ErrorCodes.ZAVOD_NOT_FOUND],
        },
      }
    }

    const currentZavodData = currentZavod as Zavod

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (input.nazev !== undefined) {
      if (!input.nazev || input.nazev.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Název závodu je povinný',
          },
        }
      }
      updateData.nazev = input.nazev.trim()
    }

    if (input.misto !== undefined) {
      updateData.misto = input.misto?.trim() || null
    }

    if (input.datum_start !== undefined) {
      const startDate = new Date(input.datum_start)
      if (isNaN(startDate.getTime())) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Neplatné datum začátku',
          },
        }
      }
      updateData.datum_start = input.datum_start
    }

    if (input.datum_end !== undefined) {
      const endDate = new Date(input.datum_end)
      if (isNaN(endDate.getTime())) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Neplatné datum konce',
          },
        }
      }
      updateData.datum_end = input.datum_end
    }

    // Validate date range
    const finalStartDate = new Date(updateData.datum_start as string || currentZavodData.datum_start)
    const finalEndDate = new Date(updateData.datum_end as string || currentZavodData.datum_end)
    
    if (finalEndDate <= finalStartDate) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Datum konce musí být po datu začátku',
        },
      }
    }

    if (input.embargo_od !== undefined) {
      if (input.embargo_od === null) {
        updateData.embargo_od = null
      } else {
        const embargoDate = new Date(input.embargo_od)
        if (isNaN(embargoDate.getTime())) {
          return {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'Neplatné datum embarga',
            },
          }
        }
        if (embargoDate < finalStartDate || embargoDate > finalEndDate) {
          return {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'Embargo musí být v rozmezí závodu',
            },
          }
        }
        updateData.embargo_od = input.embargo_od
      }
    }

    if (input.pravidla !== undefined) {
      updateData.pravidla = input.pravidla || null
    }

    if (input.stav !== undefined) {
      const validStavy = ['priprava', 'probiha', 'ukoncen']
      if (!validStavy.includes(input.stav)) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Neplatný stav závodu',
          },
        }
      }
      updateData.stav = input.stav
    }

    // Update the competition (audit log is handled by database trigger)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedZavod, error: updateError } = await (adminClient
      .from('zavody') as any)
      .update(updateData)
      .eq('id', zavodId)
      .select('*')
      .single()

    if (updateError || !updatedZavod) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: updateError?.message },
        },
      }
    }

    return {
      success: true,
      data: {
        zavod: updatedZavod as Zavod,
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
 * Randomly assign pegs to all teams in a competition
 * 
 * Requirement 2.2: Random peg assignment
 * Requirement 2.3: Ensure peg uniqueness (each peg assigned to max one team)
 * Only poradatel can perform peg lottery
 */
export async function losujPegy(zavodId: string): Promise<ActionResult<{ assignedPegs: { tymId: string; pegCislo: number }[] }>> {
  try {
    const supabase = await createClient()
    
    // Get current user
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

    // Check if user is poradatel for this competition
    const { data: zavodRole } = await supabase
      .from('zavod_role')
      .select('role')
      .eq('user_id', user.id)
      .eq('zavod_id', zavodId)
      .single()

    if (!zavodRole) {
      return {
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: ErrorMessages[ErrorCodes.FORBIDDEN],
        },
      }
    }

    const permissionCtx: PermissionContext = {
      userId: user.id,
      role: (zavodRole as Pick<ZavodRole, 'role'>).role,
      zavodId,
    }

    if (!canManageZavod(permissionCtx)) {
      return {
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: ErrorMessages[ErrorCodes.FORBIDDEN],
        },
      }
    }

    // Verify zavod exists
    const { data: zavod, error: zavodError } = await supabase
      .from('zavody')
      .select('id, stav')
      .eq('id', zavodId)
      .single()

    if (zavodError || !zavod) {
      return {
        success: false,
        error: {
          code: ErrorCodes.ZAVOD_NOT_FOUND,
          message: ErrorMessages[ErrorCodes.ZAVOD_NOT_FOUND],
        },
      }
    }

    // Get all teams in the competition
    const { data: teams, error: teamsError } = await supabase
      .from('tymy')
      .select('id')
      .eq('zavod_id', zavodId)

    if (teamsError) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    if (!teams || teams.length === 0) {
      return {
        success: false,
        error: {
          code: ErrorCodes.TYM_NOT_FOUND,
          message: 'V závodě nejsou žádné týmy',
        },
      }
    }

    const teamsData = teams as Pick<Tym, 'id'>[]
    const teamCount = teamsData.length

    // Generate random peg numbers (1 to teamCount)
    const pegNumbers = Array.from({ length: teamCount }, (_, i) => i + 1)
    
    // Fisher-Yates shuffle for random assignment
    for (let i = pegNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pegNumbers[i], pegNumbers[j]] = [pegNumbers[j], pegNumbers[i]]
    }

    // Assign pegs to teams
    const assignedPegs: { tymId: string; pegCislo: number }[] = []
    
    for (let i = 0; i < teamsData.length; i++) {
      const tymId = teamsData[i].id
      const pegCislo = pegNumbers[i]

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase
        .from('tymy') as any)
        .update({ 
          peg_cislo: pegCislo,
          updated_at: new Date().toISOString()
        })
        .eq('id', tymId)

      if (updateError) {
        return {
          success: false,
          error: {
            code: ErrorCodes.DATABASE_ERROR,
            message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
            details: { originalError: updateError.message },
          },
        }
      }

      assignedPegs.push({ tymId, pegCislo })
    }

    return {
      success: true,
      data: {
        assignedPegs,
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
 * Issue a yellow card to a team
 * 
 * Requirement 7.1: Record yellow card with reason and time
 * Requirement 7.2: Only rozhodci/poradatel can issue yellow cards
 * Requirement 7.3: Database trigger automatically zeros score on 2nd yellow card
 */
export async function udelitZlutouKartu(input: ZlutaKartaInput): Promise<ActionResult<{ zlutaKartaId: string; cardCount: number }>> {
  try {
    const supabase = await createClient()
    
    // Get current user
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

    const { tymId, zavodId, duvod } = input

    // Validate input
    if (!duvod || duvod.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Důvod žluté karty je povinný',
        },
      }
    }

    // Check if user is rozhodci or poradatel for this competition
    const { data: zavodRole } = await supabase
      .from('zavod_role')
      .select('role')
      .eq('user_id', user.id)
      .eq('zavod_id', zavodId)
      .single()

    if (!zavodRole) {
      return {
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: ErrorMessages[ErrorCodes.FORBIDDEN],
        },
      }
    }

    const permissionCtx: PermissionContext = {
      userId: user.id,
      role: (zavodRole as Pick<ZavodRole, 'role'>).role,
      zavodId,
    }

    // Requirement 7.2: Only rozhodci/poradatel can issue yellow cards
    if (!canIssueYellowCard(permissionCtx)) {
      return {
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: 'Pouze rozhodčí nebo pořadatel může udělit žlutou kartu',
        },
      }
    }

    // Verify team exists and belongs to this competition
    const { data: tym, error: tymError } = await supabase
      .from('tymy')
      .select('id, zavod_id')
      .eq('id', tymId)
      .single()

    if (tymError || !tym) {
      return {
        success: false,
        error: {
          code: ErrorCodes.TYM_NOT_FOUND,
          message: ErrorMessages[ErrorCodes.TYM_NOT_FOUND],
        },
      }
    }

    const tymData = tym as Pick<Tym, 'id' | 'zavod_id'>
    
    if (tymData.zavod_id !== zavodId) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Tým nepatří do tohoto závodu',
        },
      }
    }

    // Insert yellow card (trigger will handle disqualification on 2nd card)
    const insertData = {
      tym_id: tymId,
      zavod_id: zavodId,
      udelil_user_id: user.id,
      duvod: duvod.trim(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: zlutaKarta, error: insertError } = await (supabase
      .from('zlute_karty') as any)
      .insert(insertData)
      .select('id')
      .single()

    if (insertError || !zlutaKarta) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: insertError?.message },
        },
      }
    }

    // Get current yellow card count for this team
    const { data: cardCountData, error: countError } = await supabase
      .from('zlute_karty')
      .select('id')
      .eq('tym_id', tymId)
      .eq('zavod_id', zavodId)

    const cardCount = countError ? 1 : (cardCountData?.length || 1)

    return {
      success: true,
      data: {
        zlutaKartaId: (zlutaKarta as { id: string }).id,
        cardCount,
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
 * Set embargo time for a competition
 * 
 * Requirement 6.1: Set embargo_od time
 * Only poradatel can set embargo
 */
export async function setEmbargo(
  zavodId: string, 
  embargoOd: string | null
): Promise<ActionResult<{ embargoOd: string | null }>> {
  try {
    const supabase = await createClient()
    
    // Get current user
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

    // Check if user is poradatel for this competition
    const { data: zavodRole } = await supabase
      .from('zavod_role')
      .select('role')
      .eq('user_id', user.id)
      .eq('zavod_id', zavodId)
      .single()

    if (!zavodRole) {
      return {
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: ErrorMessages[ErrorCodes.FORBIDDEN],
        },
      }
    }

    const permissionCtx: PermissionContext = {
      userId: user.id,
      role: (zavodRole as Pick<ZavodRole, 'role'>).role,
      zavodId,
    }

    if (!canManageZavod(permissionCtx)) {
      return {
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: ErrorMessages[ErrorCodes.FORBIDDEN],
        },
      }
    }

    // Get current zavod to validate embargo time
    const { data: zavod, error: zavodError } = await supabase
      .from('zavody')
      .select('datum_start, datum_end')
      .eq('id', zavodId)
      .single()

    if (zavodError || !zavod) {
      return {
        success: false,
        error: {
          code: ErrorCodes.ZAVOD_NOT_FOUND,
          message: ErrorMessages[ErrorCodes.ZAVOD_NOT_FOUND],
        },
      }
    }

    const zavodData = zavod as Pick<Zavod, 'datum_start' | 'datum_end'>

    // Validate embargo time if provided
    if (embargoOd !== null) {
      const embargoDate = new Date(embargoOd)
      if (isNaN(embargoDate.getTime())) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Neplatné datum embarga',
          },
        }
      }

      const startDate = new Date(zavodData.datum_start)
      const endDate = new Date(zavodData.datum_end)

      if (embargoDate < startDate || embargoDate > endDate) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Embargo musí být v rozmezí závodu',
          },
        }
      }
    }

    // Update embargo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase
      .from('zavody') as any)
      .update({ 
        embargo_od: embargoOd,
        updated_at: new Date().toISOString()
      })
      .eq('id', zavodId)

    if (updateError) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: updateError.message },
        },
      }
    }

    return {
      success: true,
      data: {
        embargoOd,
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
 * Create a new team in a competition
 *
 * Requirement 2.1: Create team with captain and up to 3 members
 * Only poradatel or system admin can create teams
 */
export async function createTym(input: CreateTymInput): Promise<ActionResult<{ tymId: string }>> {
  try {
    const supabase = await createClient()

    // Get current user
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

    const { zavodId, nazev, kapitanId, clenoveIds } = input

    // Validate input
    if (!nazev || nazev.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Název týmu je povinný',
        },
      }
    }

    // Check if user is system admin first
    const isSystemAdmin = user.id === ADMIN_USER_ID

    if (!isSystemAdmin) {
      // Check system_admins table
      const { data: sysAdmin } = await supabase
        .from('system_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!sysAdmin) {
        // Check if user is poradatel for this competition
        const { data: zavodRole } = await supabase
          .from('zavod_role')
          .select('role')
          .eq('user_id', user.id)
          .eq('zavod_id', zavodId)
          .single()

        if (!zavodRole) {
          return {
            success: false,
            error: {
              code: ErrorCodes.FORBIDDEN,
              message: ErrorMessages[ErrorCodes.FORBIDDEN],
            },
          }
        }

        const permissionCtx: PermissionContext = {
          userId: user.id,
          role: (zavodRole as Pick<ZavodRole, 'role'>).role,
          zavodId,
        }

        if (!canManageZavod(permissionCtx)) {
          return {
            success: false,
            error: {
              code: ErrorCodes.FORBIDDEN,
              message: ErrorMessages[ErrorCodes.FORBIDDEN],
            },
          }
        }
      }
    }

    // Use admin client to bypass RLS
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Chybí konfigurace. Kontaktujte administrátora.',
        },
      }
    }

    // Verify zavod exists
    const { data: zavod, error: zavodError } = await adminClient
      .from('zavody')
      .select('id')
      .eq('id', zavodId)
      .single()

    if (zavodError || !zavod) {
      return {
        success: false,
        error: {
          code: ErrorCodes.ZAVOD_NOT_FOUND,
          message: ErrorMessages[ErrorCodes.ZAVOD_NOT_FOUND],
        },
      }
    }

    // Generate unique variable symbol for payment
    const variabilniSymbol = `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

    // Create the team - kapitanId is optional for admin-created teams
    const insertData = {
      zavod_id: zavodId,
      nazev: nazev.trim(),
      kapitan_id: kapitanId || user.id, // Use current user if no captain specified
      variabilni_symbol: variabilniSymbol,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tym, error: insertError } = await (adminClient
      .from('tymy') as any)
      .insert(insertData)
      .select('id')
      .single()

    if (insertError || !tym) {
      console.error('[createTym] Insert error:', insertError)
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: insertError?.message },
        },
      }
    }

    const tymId = (tym as { id: string }).id

    // Add captain as team member with role 'kapitan' (if kapitanId provided)
    if (kapitanId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: kapitanMemberError } = await (adminClient
        .from('clenove_tymu') as any)
        .insert({
          tym_id: tymId,
          user_id: kapitanId,
          role: 'kapitan',
        })

      if (kapitanMemberError) {
        console.error('Failed to add captain as team member:', kapitanMemberError)
      }
    }

    // Add additional members if provided
    if (clenoveIds && clenoveIds.length > 0) {
      // Limit to 3 additional members (requirement 2.1)
      const membersToAdd = clenoveIds.slice(0, 3).filter(id => id !== kapitanId)

      for (const clenId of membersToAdd) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminClient.from('clenove_tymu') as any)
          .insert({
            tym_id: tymId,
            user_id: clenId,
            role: 'zavodnik',
          })
      }
    }

    return {
      success: true,
      data: {
        tymId,
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
 * Generate QR code for team payment
 * 
 * Requirement 2.5: Generate QR code for payment with unique variable symbol
 * Returns a QR code string that can be used to generate a QR image
 */
export async function generatePlatbaQR(tymId: string): Promise<ActionResult<{ 
  qrData: string
  variabilniSymbol: string
  castka?: number
  ucet?: string
}>> {
  try {
    const supabase = await createClient()
    
    // Get current user
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

    // Get team with zavod info
    const { data: tym, error: tymError } = await supabase
      .from('tymy')
      .select('id, nazev, variabilni_symbol, zavod_id')
      .eq('id', tymId)
      .single()

    if (tymError || !tym) {
      return {
        success: false,
        error: {
          code: ErrorCodes.TYM_NOT_FOUND,
          message: ErrorMessages[ErrorCodes.TYM_NOT_FOUND],
        },
      }
    }

    const tymData = tym as Pick<Tym, 'id' | 'nazev' | 'variabilni_symbol' | 'zavod_id'>

    // Check if user has permission (poradatel or team captain)
    const { data: zavodRole } = await supabase
      .from('zavod_role')
      .select('role')
      .eq('user_id', user.id)
      .eq('zavod_id', tymData.zavod_id)
      .single()

    const isPoradatel = zavodRole && (zavodRole as { role: string }).role === 'poradatel'

    // Check if user is team captain
    const { data: membership } = await supabase
      .from('clenove_tymu')
      .select('role')
      .eq('user_id', user.id)
      .eq('tym_id', tymId)
      .single()

    const isKapitan = membership && (membership as { role: string }).role === 'kapitan'

    if (!isPoradatel && !isKapitan) {
      return {
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: ErrorMessages[ErrorCodes.FORBIDDEN],
        },
      }
    }

    // Generate variable symbol if not exists
    let variabilniSymbol = tymData.variabilni_symbol
    
    if (!variabilniSymbol) {
      variabilniSymbol = `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
      
      // Update team with new variable symbol
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('tymy') as any)
        .update({ variabilni_symbol: variabilniSymbol })
        .eq('id', tymId)
    }

    // Generate QR payment data in Czech QR payment format (SPAYD)
    // This is a simplified version - in production, you'd use actual bank account details
    // Format: SPD*1.0*ACC:CZ...+IBAN*AM:amount*CC:CZK*X-VS:variabilni_symbol*MSG:message
    
    // Placeholder bank account - should be configured per competition
    const bankAccount = 'CZ0000000000000000000000' // Placeholder IBAN
    const amount = 0 // Amount should be configured per competition
    const message = `Startovne tym ${tymData.nazev}`

    // SPAYD format for Czech QR payments
    const qrData = [
      'SPD*1.0',
      `ACC:${bankAccount}`,
      amount > 0 ? `AM:${amount}` : null,
      'CC:CZK',
      `X-VS:${variabilniSymbol}`,
      `MSG:${message}`,
    ].filter(Boolean).join('*')

    return {
      success: true,
      data: {
        qrData,
        variabilniSymbol,
        castka: amount > 0 ? amount : undefined,
        ucet: bankAccount,
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
 * Get all teams in a competition
 * Helper function for admin operations
 */
export async function getTeamsByZavod(zavodId: string): Promise<ActionResult<{ tymy: Tym[] }>> {
  try {
    const supabase = await createClient()
    
    const { data: tymy, error } = await supabase
      .from('tymy')
      .select('*')
      .eq('zavod_id', zavodId)
      .order('peg_cislo', { ascending: true, nullsFirst: false })

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    return {
      success: true,
      data: {
        tymy: (tymy || []) as Tym[],
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
 * Get all yellow cards for a team in a competition
 * Helper function for admin operations
 */
export async function getZluteKartyByTym(
  tymId: string, 
  zavodId: string
): Promise<ActionResult<{ zluteKarty: { id: string; duvod: string; cas: string }[] }>> {
  try {
    const supabase = await createClient()
    
    const { data: zluteKarty, error } = await supabase
      .from('zlute_karty')
      .select('id, duvod, cas')
      .eq('tym_id', tymId)
      .eq('zavod_id', zavodId)
      .order('cas', { ascending: true })

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    return {
      success: true,
      data: {
        zluteKarty: (zluteKarty || []) as { id: string; duvod: string; cas: string }[],
      },
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}
