'use server'
// @ts-nocheck

/**
 * Úlovky (Catches) Server Actions
 * 
 * Requirements:
 * - 3.1: Create catch record with weight, type, photo, and automatic timestamp
 * - 3.2: Reject catches with weight < 5kg
 * - 3.3: Set initial confirmation state to 'ceka' (waiting)
 * - 3.4: Only team members can submit catches for their team
 * - 3.5: Photo is required
 * - 3.6: Store photo in Supabase Storage
 * - 3.7: Reject catches outside competition time window
 * - 4.1: Get catches waiting for confirmation from neighbor pegs
 * - 5.7: Respect embargo (hide weights)
 * - 6.2: During embargo, show only fish count without weights
 */

import { createClient } from '@/lib/supabase/server'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import { MIN_VAHA_KG, DRUHY_RYB } from '@/lib/constants'
import { canSubmitUlovek } from '@/lib/permissions'
import type { 
  ActionResult, 
  SubmitUlovekInput, 
  UlovekWithRelations,
  PermissionContext,
  Zavod,
  Tym,
  ClenTymu,
  DruhRyby,
  StavPotvrzeni
} from '@/lib/types'

/**
 * Submit a new catch (úlovek)
 * 
 * Requirements:
 * - 3.1: Create catch with weight, type, photo, timestamp
 * - 3.2: Validate weight >= 5kg
 * - 3.3: Set stav='ceka' (waiting for confirmation)
 * - 3.4: Only team members assigned to zavod can submit
 * - 3.5: Photo is required
 * - 3.6: Upload photo to Supabase Storage
 * - 3.7: Validate time is within zavod time window
 */
export async function submitUlovek(input: SubmitUlovekInput): Promise<ActionResult<{ ulovekId: string }>> {
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
    const { zavodId, vaha, druh, fotoFile, chytilClen } = input

    // Requirement 3.2: Validate weight >= 5kg
    if (vaha < MIN_VAHA_KG) {
      return {
        success: false,
        error: {
          code: ErrorCodes.INVALID_WEIGHT,
          message: ErrorMessages[ErrorCodes.INVALID_WEIGHT],
        },
      }
    }

    // Validate fish type
    if (!DRUHY_RYB.includes(druh as typeof DRUHY_RYB[number])) {
      return {
        success: false,
        error: {
          code: ErrorCodes.INVALID_FISH_TYPE,
          message: ErrorMessages[ErrorCodes.INVALID_FISH_TYPE],
        },
      }
    }

    // Requirement 3.5: Photo is required
    if (!fotoFile || fotoFile.size === 0) {
      return {
        success: false,
        error: {
          code: ErrorCodes.MISSING_PHOTO,
          message: ErrorMessages[ErrorCodes.MISSING_PHOTO],
        },
      }
    }

    // Get zavod to validate time window
    const { data: zavod, error: zavodError } = await supabase
      .from('zavody')
      .select('*')
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

    const zavodData = zavod as Zavod

    // Requirement 3.7: Validate time is within zavod time window
    const now = new Date()
    const startDate = new Date(zavodData.datum_start)
    const endDate = new Date(zavodData.datum_end)

    if (now < startDate || now > endDate) {
      return {
        success: false,
        error: {
          code: ErrorCodes.OUTSIDE_TIME_WINDOW,
          message: ErrorMessages[ErrorCodes.OUTSIDE_TIME_WINDOW],
        },
      }
    }

    // Check if zavod is active
    if (zavodData.stav !== 'probiha') {
      return {
        success: false,
        error: {
          code: ErrorCodes.ZAVOD_NOT_ACTIVE,
          message: ErrorMessages[ErrorCodes.ZAVOD_NOT_ACTIVE],
        },
      }
    }

    // Requirement 3.4: Get user's team in this zavod
    const { data: teams } = await supabase
      .from('tymy')
      .select('id, peg_cislo')
      .eq('zavod_id', zavodId)

    if (!teams || teams.length === 0) {
      return {
        success: false,
        error: {
          code: ErrorCodes.TYM_NOT_FOUND,
          message: ErrorMessages[ErrorCodes.TYM_NOT_FOUND],
        },
      }
    }

    const teamIds = (teams as Pick<Tym, 'id' | 'peg_cislo'>[]).map(t => t.id)

    // Find user's team membership
    const { data: membership, error: membershipError } = await supabase
      .from('clenove_tymu')
      .select('tym_id, role')
      .eq('user_id', user.id)
      .in('tym_id', teamIds)
      .single()

    if (membershipError || !membership) {
      return {
        success: false,
        error: {
          code: ErrorCodes.USER_NOT_IN_TEAM,
          message: ErrorMessages[ErrorCodes.USER_NOT_IN_TEAM],
        },
      }
    }

    const membershipData = membership as Pick<ClenTymu, 'tym_id' | 'role'>
    const userTeam = (teams as Pick<Tym, 'id' | 'peg_cislo'>[]).find(t => t.id === membershipData.tym_id)

    // Check permission to submit catch
    const permissionCtx: PermissionContext = {
      userId: user.id,
      role: membershipData.role,
      tymId: membershipData.tym_id,
      pegCislo: userTeam?.peg_cislo ?? undefined,
      zavodId,
    }

    if (!canSubmitUlovek(permissionCtx)) {
      return {
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: ErrorMessages[ErrorCodes.FORBIDDEN],
        },
      }
    }

    // Requirement 3.6: Upload photo to Supabase Storage
    const fileExt = fotoFile.name.split('.').pop() || 'jpg'
    const fileName = `${zavodId}/${membershipData.tym_id}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('ulovky-photos')
      .upload(fileName, fotoFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      return {
        success: false,
        error: {
          code: ErrorCodes.STORAGE_ERROR,
          message: ErrorMessages[ErrorCodes.STORAGE_ERROR],
          details: { originalError: uploadError.message },
        },
      }
    }

    // Get public URL for the uploaded photo
    const { data: urlData } = supabase.storage
      .from('ulovky-photos')
      .getPublicUrl(fileName)

    const fotoUrl = urlData.publicUrl

    // Requirement 3.1, 3.3: Insert catch with stav='ceka'
    const insertData = {
      tym_id: membershipData.tym_id,
      zavod_id: zavodId,
      vaha,
      druh: druh as DruhRyby,
      foto_url: fotoUrl,
      chytil_user_id: chytilClen || user.id,
      stav: 'ceka' as StavPotvrzeni, // Requirement 3.3: Initial state is 'waiting'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ulovek, error: insertError } = await (supabase
      .from('ulovky') as any)
      .insert(insertData)
      .select('id')
      .single()

    if (insertError || !ulovek) {
      // Clean up uploaded photo on failure
      await supabase.storage.from('ulovky-photos').remove([fileName])
      
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: insertError?.message },
        },
      }
    }

    return {
      success: true,
      data: {
        ulovekId: (ulovek as { id: string }).id,
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
 * Get all catches for a zavod
 * 
 * Requirements:
 * - 5.7: Respect embargo (hide weights during embargo)
 * - 6.2: During embargo, show only fish count without weights
 */
export async function getUlovkyByZavod(
  zavodId: string
): Promise<ActionResult<{ ulovky: UlovekWithRelations[]; embargoActive: boolean }>> {
  try {
    const supabase = await createClient()
    
    // Get current user (optional - divak can view without login)
    const { data: { user } } = await supabase.auth.getUser()

    // Get zavod to check embargo status
    const { data: zavod, error: zavodError } = await supabase
      .from('zavody')
      .select('*')
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

    const zavodData = zavod as Zavod

    // Check if embargo is active
    const now = new Date()
    const embargoActive = zavodData.embargo_od 
      ? now >= new Date(zavodData.embargo_od) && now <= new Date(zavodData.datum_end)
      : false

    // Determine user's role for embargo visibility
    let canSeeWeights = !embargoActive
    
    if (embargoActive && user) {
      // Check if user is rozhodci or poradatel
      const { data: zavodRole } = await supabase
        .from('zavod_role')
        .select('role')
        .eq('user_id', user.id)
        .eq('zavod_id', zavodId)
        .single()

      if (zavodRole) {
        const role = (zavodRole as { role: string }).role
        canSeeWeights = role === 'rozhodci' || role === 'poradatel'
      }
    }

    // Get catches with relations
    const { data: ulovky, error: ulovkyError } = await supabase
      .from('ulovky')
      .select(`
        *,
        tym:tymy(id, nazev, peg_cislo),
        chytil:profiles!ulovky_chytil_user_id_fkey(id, jmeno),
        potvrzeni(
          id,
          potvrdil_user_id,
          potvrdil_tym_id,
          potvrzeno,
          poznamka,
          created_at
        )
      `)
      .eq('zavod_id', zavodId)
      .order('cas', { ascending: false })

    if (ulovkyError) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    // If embargo is active and user can't see weights, hide them
    let processedUlovky = ulovky as UlovekWithRelations[]
    
    if (!canSeeWeights) {
      processedUlovky = processedUlovky.map(u => ({
        ...u,
        vaha: 0, // Hide weight during embargo
      }))
    }

    return {
      success: true,
      data: {
        ulovky: processedUlovky,
        embargoActive,
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
 * Get catches waiting for confirmation from neighbor pegs
 * 
 * Requirement 4.1: Send notification to neighbor peg captains when catch is waiting
 * This function returns catches that the current user can confirm (from neighbor pegs)
 */
export async function getUlovkyKPotvrzeni(
  zavodId: string
): Promise<ActionResult<{ ulovky: UlovekWithRelations[] }>> {
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

    // Check if user is rozhodci or poradatel (can confirm any catch)
    const { data: zavodRole } = await supabase
      .from('zavod_role')
      .select('role')
      .eq('user_id', user.id)
      .eq('zavod_id', zavodId)
      .single()

    const isRozhodciOrPoradatel = zavodRole && 
      ['rozhodci', 'poradatel'].includes((zavodRole as { role: string }).role)

    // Get all teams in zavod with their peg numbers
    const { data: teams } = await supabase
      .from('tymy')
      .select('id, peg_cislo')
      .eq('zavod_id', zavodId)

    if (!teams || teams.length === 0) {
      return {
        success: true,
        data: { ulovky: [] },
      }
    }

    const teamsData = teams as Pick<Tym, 'id' | 'peg_cislo'>[]

    // Find user's team membership
    const teamIds = teamsData.map(t => t.id)
    const { data: membership } = await supabase
      .from('clenove_tymu')
      .select('tym_id, role')
      .eq('user_id', user.id)
      .in('tym_id', teamIds)
      .single()

    // Get catches waiting for confirmation (stav = 'ceka')
    let query = supabase
      .from('ulovky')
      .select(`
        *,
        tym:tymy(id, nazev, peg_cislo),
        chytil:profiles!ulovky_chytil_user_id_fkey(id, jmeno),
        potvrzeni(
          id,
          potvrdil_user_id,
          potvrdil_tym_id,
          potvrzeno,
          poznamka,
          created_at
        )
      `)
      .eq('zavod_id', zavodId)
      .eq('stav', 'ceka')
      .order('cas', { ascending: false })

    const { data: ulovky, error: ulovkyError } = await query

    if (ulovkyError) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    let filteredUlovky = ulovky as UlovekWithRelations[]

    // If user is rozhodci/poradatel, they can see all pending catches
    if (isRozhodciOrPoradatel) {
      return {
        success: true,
        data: { ulovky: filteredUlovky },
      }
    }

    // If user is not in a team, they can't confirm anything
    if (!membership) {
      return {
        success: true,
        data: { ulovky: [] },
      }
    }

    const membershipData = membership as Pick<ClenTymu, 'tym_id' | 'role'>
    
    // Only kapitans can confirm catches
    if (membershipData.role !== 'kapitan') {
      return {
        success: true,
        data: { ulovky: [] },
      }
    }

    // Get user's peg number
    const userTeam = teamsData.find(t => t.id === membershipData.tym_id)
    if (!userTeam || userTeam.peg_cislo === null) {
      return {
        success: true,
        data: { ulovky: [] },
      }
    }

    const userPeg = userTeam.peg_cislo

    // Filter to only neighbor pegs (peg ± 1) and exclude own team
    // Also exclude catches user has already confirmed
    filteredUlovky = filteredUlovky.filter(u => {
      // Exclude own team's catches (self-confirmation prevention)
      if (u.tym_id === membershipData.tym_id) {
        return false
      }

      // Check if user already confirmed this catch
      const alreadyConfirmed = u.potvrzeni?.some(
        p => p.potvrdil_user_id === user.id || p.potvrdil_tym_id === membershipData.tym_id
      )
      if (alreadyConfirmed) {
        return false
      }

      // Check if catch is from neighbor peg
      const catchTeam = teamsData.find(t => t.id === u.tym_id)
      if (!catchTeam || catchTeam.peg_cislo === null) {
        return false
      }

      const pegDiff = Math.abs(catchTeam.peg_cislo - userPeg)
      return pegDiff === 1
    })

    return {
      success: true,
      data: { ulovky: filteredUlovky },
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}
