'use server'

/**
 * Pozvánka Server Actions
 *
 * Akce pro správu pozvánek:
 * - Vytvoření pozvánky
 * - Odeslání magic linku
 * - Ověření tokenu
 * - Registrace přes pozvánku
 */

import { createClient } from '@/lib/supabase/server'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import type {
  ActionResult,
  Pozvanka,
  CreatePozvankaInput,
  UserRole,
} from '@/lib/types'

/**
 * Kontrola admin přístupu k závodu
 */
async function checkZavodAdminAccess(zavodId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: role } = await supabase
    .from('zavod_role')
    .select('role')
    .eq('zavod_id', zavodId)
    .eq('user_id', user.id)
    .in('role', ['poradatel', 'hlavni_admin'])
    .single()

  if (!role) {
    // Zkus hlavni_admin bez závod_id
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
 * Získat pozvánky pro závod
 */
export async function getPozvankyByZavod(zavodId: string): Promise<ActionResult<Pozvanka[]>> {
  try {
    const supabase = await createClient()

    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění pro přístup k pozvánkám',
        },
      }
    }

    const { data: pozvanky, error } = await supabase
      .from('pozvanky')
      .select('*')
      .eq('zavod_id', zavodId)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    return { success: true, data: pozvanky || [] }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Získat pozvánky pro tým
 */
export async function getPozvankyByTym(tymId: string): Promise<ActionResult<Pozvanka[]>> {
  try {
    const supabase = await createClient()

    // Získat závod_id z týmu
    const { data: tym } = await supabase
      .from('tymy')
      .select('zavod_id')
      .eq('id', tymId)
      .single()

    if (!tym) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Tým nenalezen',
        },
      }
    }

    const userId = await checkZavodAdminAccess(tym.zavod_id)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění pro přístup k pozvánkám',
        },
      }
    }

    const { data: pozvanky, error } = await supabase
      .from('pozvanky')
      .select('*')
      .eq('tym_id', tymId)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    return { success: true, data: pozvanky || [] }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Vytvořit pozvánku
 */
export async function createPozvanka(input: CreatePozvankaInput): Promise<ActionResult<Pozvanka>> {
  try {
    const supabase = await createClient()

    const userId = await checkZavodAdminAccess(input.zavodId)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění vytvářet pozvánky',
        },
      }
    }

    // Validace
    if (!input.email || !input.email.includes('@')) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Neplatný email',
        },
      }
    }

    if (!input.jmeno || input.jmeno.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Jméno je povinné',
        },
      }
    }

    // Získat datum konce závodu pro platnost pozvánky
    const { data: zavod } = await supabase
      .from('zavody')
      .select('datum_end')
      .eq('id', input.zavodId)
      .single()

    const platnostDo = input.platnostDo || zavod?.datum_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: pozvanka, error } = await supabase
      .from('pozvanky')
      .insert({
        zavod_id: input.zavodId,
        tym_id: input.tymId || null,
        email: input.email.toLowerCase().trim(),
        jmeno: input.jmeno.trim(),
        telefon: input.telefon?.trim() || null,
        role: (input.role || 'zavodnik') as UserRole,
        platnost_do: platnostDo,
      })
      .select('*')
      .single()

    if (error) {
      // Kontrola duplicity
      if (error.code === '23505') {
        return {
          success: false,
          error: {
            code: 'DUPLICATE',
            message: 'Pozvánka pro tento email již existuje',
          },
        }
      }
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: error.message },
        },
      }
    }

    return { success: true, data: pozvanka }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Znovu odeslat pozvánku (vygenerovat nový token)
 */
export async function resendPozvanka(pozvankaId: string): Promise<ActionResult<Pozvanka>> {
  try {
    const supabase = await createClient()

    // Získat pozvánku
    const { data: existingPozvanka } = await supabase
      .from('pozvanky')
      .select('*, zavod:zavody(datum_end)')
      .eq('id', pozvankaId)
      .single()

    if (!existingPozvanka) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Pozvánka nenalezena',
        },
      }
    }

    const userId = await checkZavodAdminAccess(existingPozvanka.zavod_id)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění upravovat pozvánky',
        },
      }
    }

    if (existingPozvanka.pouzita) {
      return {
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Pozvánka již byla použita',
        },
      }
    }

    // Vygenerovat nový token a prodloužit platnost
    const zavod = existingPozvanka.zavod as { datum_end: string } | null
    const newPlatnostDo = zavod?.datum_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: pozvanka, error } = await supabase
      .from('pozvanky')
      .update({
        token: crypto.randomUUID(),
        platnost_do: newPlatnostDo,
      })
      .eq('id', pozvankaId)
      .select('*')
      .single()

    if (error || !pozvanka) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    return { success: true, data: pozvanka }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Smazat pozvánku
 */
export async function deletePozvanka(pozvankaId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Získat pozvánku
    const { data: existingPozvanka } = await supabase
      .from('pozvanky')
      .select('zavod_id, pouzita')
      .eq('id', pozvankaId)
      .single()

    if (!existingPozvanka) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Pozvánka nenalezena',
        },
      }
    }

    const userId = await checkZavodAdminAccess(existingPozvanka.zavod_id)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění mazat pozvánky',
        },
      }
    }

    if (existingPozvanka.pouzita) {
      return {
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Nelze smazat použitou pozvánku',
        },
      }
    }

    const { error } = await supabase
      .from('pozvanky')
      .delete()
      .eq('id', pozvankaId)

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Ověřit pozvánku pomocí tokenu (veřejná akce - bez auth)
 */
export async function verifyPozvanka(token: string): Promise<ActionResult<{
  pozvanka: Pozvanka
  zavod: { id: string; nazev: string; misto: string | null }
  tym: { id: string; nazev: string; barva: string } | null
}>> {
  try {
    const supabase = await createClient()

    const { data: pozvanka, error } = await supabase
      .from('pozvanky')
      .select(`
        *,
        zavod:zavody(id, nazev, misto),
        tym:tymy(id, nazev, barva)
      `)
      .eq('token', token)
      .single()

    if (error || !pozvanka) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Pozvánka nenalezena nebo neplatná',
        },
      }
    }

    if (pozvanka.pouzita) {
      return {
        success: false,
        error: {
          code: 'ALREADY_USED',
          message: 'Tato pozvánka již byla použita',
        },
      }
    }

    if (new Date(pozvanka.platnost_do) < new Date()) {
      return {
        success: false,
        error: {
          code: 'EXPIRED',
          message: 'Platnost pozvánky vypršela',
        },
      }
    }

    return {
      success: true,
      data: {
        pozvanka: {
          id: pozvanka.id,
          zavod_id: pozvanka.zavod_id,
          tym_id: pozvanka.tym_id,
          email: pozvanka.email,
          jmeno: pozvanka.jmeno,
          telefon: pozvanka.telefon,
          role: pozvanka.role,
          token: pozvanka.token,
          platnost_do: pozvanka.platnost_do,
          pouzita: pozvanka.pouzita,
          registrovano_at: pozvanka.registrovano_at,
          created_at: pozvanka.created_at,
        },
        zavod: pozvanka.zavod as { id: string; nazev: string; misto: string | null },
        tym: pozvanka.tym as { id: string; nazev: string; barva: string } | null,
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
 * Registrace přes pozvánku
 */
export async function registerViaInvitation(token: string): Promise<ActionResult<{
  zavodId: string
  tymId: string | null
  needsSignup: boolean
  email?: string
  jmeno?: string
}>> {
  try {
    const supabase = await createClient()

    // Zavolat DB funkci
    const { data, error } = await supabase
      .rpc('register_via_invitation', { p_token: token })

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: error.message },
        },
      }
    }

    const result = data as {
      success: boolean
      error?: string
      needs_signup?: boolean
      user_id?: string
      zavod_id?: string
      tym_id?: string
      email?: string
      jmeno?: string
      pozvanka_id?: string
    }

    if (!result.success) {
      return {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: result.error || 'Registrace se nezdařila',
        },
      }
    }

    return {
      success: true,
      data: {
        zavodId: result.zavod_id!,
        tymId: result.tym_id || null,
        needsSignup: result.needs_signup || false,
        email: result.email,
        jmeno: result.jmeno,
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
 * Dokončit registraci po vytvoření uživatele
 */
export async function completeInvitationRegistration(
  pozvankaId: string,
  userId: string
): Promise<ActionResult<{ zavodId: string; tymId: string | null }>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .rpc('complete_invitation_registration', {
        p_pozvanka_id: pozvankaId,
        p_user_id: userId,
      })

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: error.message },
        },
      }
    }

    const result = data as {
      success: boolean
      error?: string
      zavod_id?: string
      tym_id?: string
    }

    if (!result.success) {
      return {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: result.error || 'Dokončení registrace se nezdařilo',
        },
      }
    }

    return {
      success: true,
      data: {
        zavodId: result.zavod_id!,
        tymId: result.tym_id || null,
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
 * Hromadné vytvoření pozvánek
 */
export async function createPozvankyBatch(
  zavodId: string,
  tymId: string | null,
  members: Array<{ email: string; jmeno: string; role?: 'zavodnik' | 'kapitan' }>
): Promise<ActionResult<{ created: number; errors: string[] }>> {
  try {
    const supabase = await createClient()

    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění vytvářet pozvánky',
        },
      }
    }

    // Získat datum konce závodu
    const { data: zavod } = await supabase
      .from('zavody')
      .select('datum_end')
      .eq('id', zavodId)
      .single()

    const platnostDo = zavod?.datum_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    let created = 0
    const errors: string[] = []

    for (const member of members) {
      if (!member.email || !member.email.includes('@')) {
        errors.push(`Neplatný email: ${member.email}`)
        continue
      }

      if (!member.jmeno || member.jmeno.trim().length === 0) {
        errors.push(`Chybí jméno pro: ${member.email}`)
        continue
      }

      const { error } = await supabase
        .from('pozvanky')
        .insert({
          zavod_id: zavodId,
          tym_id: tymId,
          email: member.email.toLowerCase().trim(),
          jmeno: member.jmeno.trim(),
          role: member.role || 'zavodnik',
          platnost_do: platnostDo,
        })

      if (error) {
        if (error.code === '23505') {
          errors.push(`Duplicitní pozvánka: ${member.email}`)
        } else {
          errors.push(`Chyba pro ${member.email}: ${error.message}`)
        }
      } else {
        created++
      }
    }

    return {
      success: true,
      data: { created, errors },
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}
