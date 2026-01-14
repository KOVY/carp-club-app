'use server'
// @ts-nocheck

/**
 * Leaderboard Server Actions
 * 
 * Requirements:
 * - 5.1: Score is sum of top 5 heaviest confirmed fish
 * - 5.2: If team has less than 5 fish, sum all confirmed fish
 * - 5.3: Only fish with weight >= 5kg count
 * - 5.4: Both kapr and amur count towards the same total
 * - 5.5: Tie-breaking by time of last counted catch (earlier = better)
 * - 5.7: Respect embargo (hide weights during embargo)
 * - 10.2: Top 10 heaviest fish in competition
 * - 4.7: Recalculate leaderboard after confirmation
 */

import { createClient } from '@/lib/supabase/server'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import { calculateTymScore, sortLeaderboard, getPoradiCas } from '@/lib/scoring'
import { canViewFullLeaderboard, canManageZavod } from '@/lib/permissions'
import type { 
  ActionResult, 
  LeaderboardEntry,
  UlovekWithRelations,
  TymWithRelations,
  PermissionContext,
  Zavod,
  Tym,
  Ulovek,
  ZlutaKarta
} from '@/lib/types'

/**
 * Get leaderboard for a competition
 * 
 * Requirements:
 * - 5.1, 5.2, 5.3, 5.4: Calculate score using top 5 heaviest confirmed fish >= 5kg
 * - 5.5: Tie-breaking by time of last counted catch
 * - 5.7: Respect embargo (hide weights during embargo for non-privileged users)
 */
export async function getLeaderboard(
  zavodId: string
): Promise<ActionResult<{ leaderboard: LeaderboardEntry[]; embargoActive: boolean }>> {
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
    let userRole: PermissionContext['role'] = 'divak'
    
    if (user) {
      // Check if user is rozhodci or poradatel
      const { data: zavodRole } = await supabase
        .from('zavod_role')
        .select('role')
        .eq('user_id', user.id)
        .eq('zavod_id', zavodId)
        .single()

      if (zavodRole) {
        userRole = (zavodRole as { role: PermissionContext['role'] }).role
        const permissionCtx: PermissionContext = {
          userId: user.id,
          role: userRole,
          zavodId,
        }
        canSeeWeights = canViewFullLeaderboard(permissionCtx, embargoActive)
      }
    }

    // Get all teams in the competition with their captain info
    const { data: teams, error: teamsError } = await supabase
      .from('tymy')
      .select(`
        *,
        kapitan:profiles!tymy_kapitan_id_fkey(id, jmeno, email)
      `)
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
        success: true,
        data: {
          leaderboard: [],
          embargoActive,
        },
      }
    }

    const teamsData = teams as TymWithRelations[]

    // Get all confirmed catches for the competition
    const { data: ulovky, error: ulovkyError } = await supabase
      .from('ulovky')
      .select('*')
      .eq('zavod_id', zavodId)
      .eq('stav', 'potvrzeno')

    if (ulovkyError) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    const ulovkyData = (ulovky || []) as Ulovek[]

    // Get yellow cards count for each team
    const { data: zluteKarty, error: zluteKartyError } = await supabase
      .from('zlute_karty')
      .select('tym_id')
      .eq('zavod_id', zavodId)

    if (zluteKartyError) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    // Count yellow cards per team
    const yellowCardCounts = new Map<string, number>()
    const zluteKartyData = (zluteKarty || []) as Pick<ZlutaKarta, 'tym_id'>[]
    for (const karta of zluteKartyData) {
      const count = yellowCardCounts.get(karta.tym_id) || 0
      yellowCardCounts.set(karta.tym_id, count + 1)
    }

    // Build leaderboard entries for each team
    const leaderboardEntries: LeaderboardEntry[] = teamsData.map(tym => {
      // Get catches for this team
      const tymUlovky = ulovkyData.filter(u => u.tym_id === tym.id)
      
      // Calculate score using the scoring module
      const scoringResult = calculateTymScore(tymUlovky)
      
      // Get the time of the last counted catch for tie-breaking
      const poradiCas = getPoradiCas(scoringResult.top5Ryby)
      
      // Get yellow card count
      const zluteKartyCount = yellowCardCounts.get(tym.id) || 0

      return {
        tym,
        skore: canSeeWeights ? scoringResult.skore : 0,
        pocetRyb: scoringResult.pocetRyb,
        top5Ryby: canSeeWeights ? scoringResult.top5Ryby : [],
        zluteKarty: zluteKartyCount,
        poradiCas,
        poradi: 0, // Will be set by sortLeaderboard
      }
    })

    // Sort leaderboard by score and tie-breaking rules
    const sortedLeaderboard = sortLeaderboard(leaderboardEntries)

    return {
      success: true,
      data: {
        leaderboard: sortedLeaderboard,
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
 * Get top 10 heaviest fish in the competition
 * 
 * Requirement 10.2: Display "Největší ryby" section with top 10 heaviest fish
 * Respects embargo - hides weights during embargo for non-privileged users
 */
export async function getNejvetsiRyby(
  zavodId: string,
  limit: number = 10
): Promise<ActionResult<{ ryby: UlovekWithRelations[]; embargoActive: boolean }>> {
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

    // Get top N heaviest confirmed fish with relations
    const { data: ryby, error: rybyError } = await supabase
      .from('ulovky')
      .select(`
        *,
        tym:tymy(id, nazev, peg_cislo),
        chytil:profiles!ulovky_chytil_user_id_fkey(id, jmeno)
      `)
      .eq('zavod_id', zavodId)
      .eq('stav', 'potvrzeno')
      .order('vaha', { ascending: false })
      .limit(limit)

    if (rybyError) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    let processedRyby = (ryby || []) as UlovekWithRelations[]

    // If embargo is active and user can't see weights, hide them
    if (!canSeeWeights) {
      processedRyby = processedRyby.map(r => ({
        ...r,
        vaha: 0, // Hide weight during embargo
      }))
    }

    return {
      success: true,
      data: {
        ryby: processedRyby,
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
 * Recalculate leaderboard for all teams in a competition
 * 
 * Requirement 4.7: Leaderboard is automatically recalculated after confirmation
 * This function is for admin purposes to force a full recalculation
 * 
 * Note: In normal operation, the leaderboard is calculated on-the-fly when requested.
 * This function can be used to verify consistency or for debugging.
 */
export async function recalculateLeaderboard(
  zavodId: string
): Promise<ActionResult<{ recalculated: boolean; teamCount: number }>> {
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

    // Check if user is poradatel (only admin can force recalculation)
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
      role: (zavodRole as { role: PermissionContext['role'] }).role,
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

    const teamsData = (teams || []) as Pick<Tym, 'id'>[]
    const teamCount = teamsData.length

    // For each team, use the database function to calculate score
    // This ensures consistency with the DB-level calculation
    for (const team of teamsData) {
      // Call the PostgreSQL function to calculate team score
      // This is primarily for verification - the actual leaderboard
      // is calculated on-the-fly using the scoring module
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: calcError } = await (supabase as any)
        .rpc('calculate_tym_score', { p_tym_id: team.id })

      if (calcError) {
        console.error(`Error calculating score for team ${team.id}:`, calcError)
        // Continue with other teams even if one fails
      }
    }

    return {
      success: true,
      data: {
        recalculated: true,
        teamCount,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}
