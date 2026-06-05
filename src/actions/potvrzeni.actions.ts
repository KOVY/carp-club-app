'use server'
// @ts-nocheck

/**
 * Potvrzení (Confirmation) Server Actions
 * 
 * Requirements:
 * - 4.2: Neighbor peg captain can confirm a catch
 * - 4.3: Catch is confirmed when both neighbors (peg-1 and peg+1) confirm
 * - 4.4: Referee confirmation marks catch as confirmed regardless of neighbors
 * - 4.5: Edge pegs (first/last) require only one neighbor or referee
 * - 4.6: Self-confirmation is forbidden
 * - 4.7: Leaderboard is automatically recalculated after confirmation
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import { canConfirmUlovek, isSelfConfirmation } from '@/lib/permissions'
import type { 
  ActionResult, 
  PotvrzeniInput,
  UlovekWithRelations,
  PermissionContext,
  Tym,
  ClenTymu,
  Ulovek
} from '@/lib/types'

/**
 * Confirm or reject a catch (úlovek)
 * 
 * Requirements:
 * - 4.2: Neighbor peg captain can confirm
 * - 4.3: Both neighbors must confirm for middle pegs
 * - 4.4: Referee/organizer can confirm any catch
 * - 4.5: Edge pegs need only one neighbor
 * - 4.6: Cannot confirm own team's catch
 * 
 * The database trigger `check_ulovek_confirmation()` automatically updates
 * the catch status when enough confirmations are received.
 */
export async function potvrditUlovek(input: PotvrzeniInput): Promise<ActionResult<{ potvrzeniId: string }>> {
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

    const { ulovekId, potvrzeno, poznamka } = input

    // Get the catch with team info
    const { data: ulovek, error: ulovekError } = await supabase
      .from('ulovky')
      .select(`
        *,
        tym:tymy(id, nazev, peg_cislo, zavod_id)
      `)
      .eq('id', ulovekId)
      .single()

    if (ulovekError || !ulovek) {
      return {
        success: false,
        error: {
          code: ErrorCodes.ULOVEK_NOT_FOUND,
          message: ErrorMessages[ErrorCodes.ULOVEK_NOT_FOUND],
        },
      }
    }

    const ulovekData = ulovek as Ulovek & { tym: Tym }
    const zavodId = ulovekData.zavod_id
    const ulovekTymPeg = ulovekData.tym?.peg_cislo

    // Check if catch is already confirmed or rejected
    if (ulovekData.stav !== 'ceka') {
      return {
        success: false,
        error: {
          code: ErrorCodes.ALREADY_CONFIRMED,
          message: ErrorMessages[ErrorCodes.ALREADY_CONFIRMED],
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
        success: false,
        error: {
          code: ErrorCodes.TYM_NOT_FOUND,
          message: ErrorMessages[ErrorCodes.TYM_NOT_FOUND],
        },
      }
    }

    const teamsData = teams as Pick<Tym, 'id' | 'peg_cislo'>[]
    const teamIds = teamsData.map(t => t.id)

    // Find user's team membership
    const { data: membership } = await supabase
      .from('clenove_tymu')
      .select('tym_id, role')
      .eq('user_id', user.id)
      .in('tym_id', teamIds)
      .single()

    // Build permission context
    let permissionCtx: PermissionContext

    if (isRozhodciOrPoradatel) {
      // Rozhodci/poradatel can confirm any catch
      permissionCtx = {
        userId: user.id,
        role: (zavodRole as { role: 'rozhodci' | 'poradatel' }).role,
        zavodId,
      }
    } else if (membership) {
      const membershipData = membership as Pick<ClenTymu, 'tym_id' | 'role'>
      const userTeam = teamsData.find(t => t.id === membershipData.tym_id)
      
      permissionCtx = {
        userId: user.id,
        role: membershipData.role,
        tymId: membershipData.tym_id,
        pegCislo: userTeam?.peg_cislo ?? undefined,
        zavodId,
      }
    } else {
      // User is not in any team and not rozhodci/poradatel
      return {
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: ErrorMessages[ErrorCodes.FORBIDDEN],
        },
      }
    }

    // Requirement 4.6: Check for self-confirmation
    if (permissionCtx.tymId && isSelfConfirmation(permissionCtx, ulovekData.tym_id)) {
      return {
        success: false,
        error: {
          code: ErrorCodes.SELF_CONFIRMATION,
          message: ErrorMessages[ErrorCodes.SELF_CONFIRMATION],
        },
      }
    }

    // Tým bez přiděleného pegu může potvrdit jen rozhodčí/pořadatel (jinak by ho potvrdil kdokoli)
    const jeRozhodci = permissionCtx.role === 'rozhodci' || permissionCtx.role === 'poradatel' || permissionCtx.role === 'hlavni_admin'
    if (ulovekTymPeg === null && !jeRozhodci) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_NEIGHBOR_PEG,
          message: ErrorMessages[ErrorCodes.NOT_NEIGHBOR_PEG],
        },
      }
    }

    // Check if user can confirm this catch (neighbor peg or rozhodci/poradatel)
    if (ulovekTymPeg !== null && !canConfirmUlovek(permissionCtx, ulovekTymPeg)) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_NEIGHBOR_PEG,
          message: ErrorMessages[ErrorCodes.NOT_NEIGHBOR_PEG],
        },
      }
    }

    // Rozhodčí/pořadatel - okamžité potvrzení bez záznamu v tabulce potvrzeni
    // Requirement 4.4: Referee confirmation marks catch as confirmed immediately
    if (isRozhodciOrPoradatel) {
      const adminClient = createAdminClient()

      if (potvrzeno) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (adminClient.from('ulovky') as any)
          .update({
            stav: 'potvrzeno',
            potvrzeno_rozhodcim: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', ulovekId)

        if (updateError) {
          console.error('[potvrditUlovek] Rozhodci update error:', updateError)
          return {
            success: false,
            error: {
              code: ErrorCodes.DATABASE_ERROR,
              message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
              details: { originalError: updateError.message },
            },
          }
        }
      } else {
        // Rozhodčí zamítl úlovek
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (adminClient.from('ulovky') as any)
          .update({
            stav: 'zamitnuto',
            updated_at: new Date().toISOString()
          })
          .eq('id', ulovekId)

        if (updateError) {
          console.error('[potvrditUlovek] Rozhodci reject error:', updateError)
          return {
            success: false,
            error: {
              code: ErrorCodes.DATABASE_ERROR,
              message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
              details: { originalError: updateError.message },
            },
          }
        }
      }

      return {
        success: true,
        data: {
          potvrzeniId: `rozhodci-${ulovekId}`, // Pseudo ID pro rozhodčího
        },
      }
    }

    // Kapitán sousedního pegu - standardní potvrzení
    // Musí mít tým
    if (!permissionCtx.tymId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.USER_NOT_IN_TEAM,
          message: 'Pro potvrzení úlovku musíte být členem týmu',
        },
      }
    }

    // Check if user/team has already confirmed this catch
    const { data: existingPotvrzeni } = await supabase
      .from('potvrzeni')
      .select('id')
      .eq('ulovek_id', ulovekId)
      .eq('potvrdil_tym_id', permissionCtx.tymId)
      .single()

    if (existingPotvrzeni) {
      return {
        success: false,
        error: {
          code: ErrorCodes.ALREADY_CONFIRMED,
          message: 'Váš tým již tento úlovek potvrdil',
        },
      }
    }

    // Insert confirmation record using admin client (permissions already verified)
    // The database trigger will automatically update the catch status
    const adminClient = createAdminClient()

    const insertData = {
      ulovek_id: ulovekId,
      potvrdil_user_id: user.id,
      potvrdil_tym_id: permissionCtx.tymId,
      potvrzeno,
      poznamka: poznamka || null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: potvrzeni, error: insertError } = await (adminClient
      .from('potvrzeni') as any)
      .insert(insertData)
      .select('id')
      .single()

    if (insertError || !potvrzeni) {
      console.error('[potvrditUlovek] Insert error:', insertError)
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
        potvrzeniId: (potvrzeni as { id: string }).id,
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
 * Get catches pending confirmation from the current user
 * 
 * Requirement 4.1: Get catches waiting for confirmation
 * Returns catches that the current user can and should confirm
 */
export async function getPendingPotvrzeni(
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
      .eq('stav', 'ceka')
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

    let filteredUlovky = ulovky as UlovekWithRelations[]

    // If user is rozhodci/poradatel, they can see all pending catches
    // that they haven't confirmed yet
    if (isRozhodciOrPoradatel) {
      filteredUlovky = filteredUlovky.filter(u => {
        // Exclude catches user has already confirmed
        const alreadyConfirmed = u.potvrzeni?.some(
          p => p.potvrdil_user_id === user.id
        )
        return !alreadyConfirmed
      })

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
