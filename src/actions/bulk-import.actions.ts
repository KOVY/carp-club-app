'use server'

/**
 * Bulk Import Server Actions
 *
 * Akce pro hromadný import týmů z Excel/CSV
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ErrorCodes, toErrorResponse } from '@/lib/errors'
import { isSystemAdmin } from '@/lib/constants'
import type { ActionResult } from '@/lib/types'

interface ImportedMember {
  jmeno: string
  email: string
  telefon?: string
  role: 'kapitan' | 'zavodnik'
}

interface ImportedTeam {
  nazev: string
  members: ImportedMember[]
}

interface ImportResult {
  teamsCreated: number
  membersCreated: number
  errors: string[]
}

/**
 * Kontrola admin přístupu k závodu
 */
async function checkZavodAdminAccess(zavodId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Centralized system admin check
  if (isSystemAdmin(user.id)) {
    return user.id
  }

  // Check system_admins via SECURITY DEFINER RPC (po migraci 016 už není přímý SELECT povolen)
  const { data: isSysAdmin } = await (supabase as any).rpc('is_system_admin', { p_user_id: user.id })
  if (isSysAdmin === true) {
    return user.id
  }

  // Check zavod_role
  const { data: role } = await supabase
    .from('zavod_role')
    .select('role')
    .eq('zavod_id', zavodId)
    .eq('user_id', user.id)
    .in('role', ['poradatel', 'hlavni_admin'])
    .single()

  if (!role) {
    const { data: hlavniAdmin } = await supabase
      .from('zavod_role')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'hlavni_admin')
      .single()

    if (!hlavniAdmin) return null
  }

  return user.id
}

/**
 * Generování slug z jména
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Generování barvy týmu
 */
function getTeamColor(index: number): string {
  const colors = [
    '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
    '#ea580c', '#0891b2', '#be185d', '#65a30d', '#7c3aed',
  ]
  return colors[index % colors.length]
}

/**
 * Bulk import týmů
 */
export async function bulkImportTeams(
  zavodId: string,
  teams: ImportedTeam[]
): Promise<ActionResult<ImportResult>> {
  try {
    const adminClient = createAdminClient()

    // Check access
    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění importovat týmy',
        },
      }
    }

    // Verify závod exists
    const { data: zavod, error: zavodError } = await adminClient
      .from('zavody')
      .select('id, nazev')
      .eq('id', zavodId)
      .single()

    if (zavodError || !zavod) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Závod nenalezen',
        },
      }
    }

    let teamsCreated = 0
    let membersCreated = 0
    const errors: string[] = []

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i]
      const teamColor = getTeamColor(i)

      try {
        // Find kapitan
        const kapitanData = team.members.find(m => m.role === 'kapitan')
        if (!kapitanData) {
          errors.push(`Tým "${team.nazev}": Chybí kapitán`)
          continue
        }

        // Create kapitán user (placeholder or real)
        let kapitanId: string | null = null

        if (kapitanData.email && kapitanData.email.includes('@') && !kapitanData.email.includes('@placeholder')) {
          // Real email - check if user exists
          const { data: existingUsers } = await adminClient.auth.admin.listUsers()
          const existingUser = existingUsers?.users?.find(
            u => u.email?.toLowerCase() === kapitanData.email.toLowerCase()
          )

          if (existingUser) {
            kapitanId = existingUser.id
          } else {
            // Create new user
            const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
              email: kapitanData.email.toLowerCase(),
              email_confirm: true,
              user_metadata: { jmeno: kapitanData.jmeno },
            })

            if (createError || !newUser.user) {
              errors.push(`Tým "${team.nazev}": Nepodařilo se vytvořit uživatele ${kapitanData.email}`)
              continue
            }
            kapitanId = newUser.user.id
          }
        } else {
          // Placeholder user
          const slug = generateSlug(kapitanData.jmeno)
          const placeholderEmail = `${slug}-${Date.now()}@placeholder.local`

          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: placeholderEmail,
            email_confirm: true,
            user_metadata: { jmeno: kapitanData.jmeno, is_placeholder: true },
          })

          if (createError || !newUser.user) {
            errors.push(`Tým "${team.nazev}": Nepodařilo se vytvořit placeholder pro ${kapitanData.jmeno}`)
            continue
          }
          kapitanId = newUser.user.id
        }

        // Create/update kapitán profile
        await (adminClient
          .from('profiles') as any)
          .upsert({
            id: kapitanId,
            email: kapitanData.email || `placeholder-${kapitanId}@placeholder.local`,
            jmeno: kapitanData.jmeno,
            telefon: kapitanData.telefon || null,
          }, { onConflict: 'id' })

        // Create team
        const { data: tymData, error: tymError } = await (adminClient
          .from('tymy') as any)
          .insert({
            zavod_id: zavodId,
            nazev: team.nazev,
            kapitan_id: kapitanId,
            barva: teamColor,
          })
          .select('id')
          .single()

        if (tymError || !tymData) {
          errors.push(`Tým "${team.nazev}": Nepodařilo se vytvořit tým - ${tymError?.message}`)
          continue
        }

        const tymId = tymData.id
        teamsCreated++

        // Add kapitán to team
        await (adminClient.from('clenove_tymu') as any).insert({
          tym_id: tymId,
          user_id: kapitanId,
          role: 'kapitan',
        })

        // Add kapitán zavod role
        await (adminClient.from('zavod_role') as any).upsert({
          zavod_id: zavodId,
          user_id: kapitanId,
          role: 'kapitan',
        }, { onConflict: 'zavod_id,user_id' })

        membersCreated++

        // Create other members
        for (const member of team.members) {
          if (member.role === 'kapitan') continue // Already handled

          let memberId: string | null = null

          if (member.email && member.email.includes('@') && !member.email.includes('@placeholder')) {
            // Real email
            const { data: existingUsers } = await adminClient.auth.admin.listUsers()
            const existingUser = existingUsers?.users?.find(
              u => u.email?.toLowerCase() === member.email.toLowerCase()
            )

            if (existingUser) {
              memberId = existingUser.id
            } else {
              const { data: newUser } = await adminClient.auth.admin.createUser({
                email: member.email.toLowerCase(),
                email_confirm: true,
                user_metadata: { jmeno: member.jmeno },
              })
              memberId = newUser?.user?.id || null
            }
          } else {
            // Placeholder
            const slug = generateSlug(member.jmeno)
            const placeholderEmail = `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@placeholder.local`

            const { data: newUser } = await adminClient.auth.admin.createUser({
              email: placeholderEmail,
              email_confirm: true,
              user_metadata: { jmeno: member.jmeno, is_placeholder: true },
            })
            memberId = newUser?.user?.id || null
          }

          if (!memberId) {
            errors.push(`Tým "${team.nazev}": Nepodařilo se vytvořit člena ${member.jmeno}`)
            continue
          }

          // Create profile
          await (adminClient.from('profiles') as any).upsert({
            id: memberId,
            email: member.email || `placeholder-${memberId}@placeholder.local`,
            jmeno: member.jmeno,
            telefon: member.telefon || null,
          }, { onConflict: 'id' })

          // Add to team
          await (adminClient.from('clenove_tymu') as any).insert({
            tym_id: tymId,
            user_id: memberId,
            role: 'zavodnik',
          })

          // Add zavod role
          await (adminClient.from('zavod_role') as any).upsert({
            zavod_id: zavodId,
            user_id: memberId,
            role: 'zavodnik',
          }, { onConflict: 'zavod_id,user_id' })

          membersCreated++
        }
      } catch (err) {
        errors.push(`Tým "${team.nazev}": ${err instanceof Error ? err.message : 'Neznámá chyba'}`)
      }
    }

    return {
      success: true,
      data: {
        teamsCreated,
        membersCreated,
        errors,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}
