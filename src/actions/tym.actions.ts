'use server'

/**
 * Tým Server Actions
 *
 * Akce pro správu týmů:
 * - Vytvoření týmu s barvou
 * - Přidání/odebrání členů
 * - Aktualizace týmu
 */

import { createClient } from '@/lib/supabase/server'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import type {
  ActionResult,
  Tym,
  TymOverview,
  Profile,
  ClenTymuWithUser,
} from '@/lib/types'

// Typ pro tým s členy
export interface TymWithClenove extends Tym {
  kapitan?: Profile
  clenove: ClenTymuWithUser[]
}

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
 * Získat přehled týmů závodu
 */
export async function getTymyOverview(zavodId: string): Promise<ActionResult<TymOverview[]>> {
  try {
    const supabase = await createClient()

    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění pro přístup k týmům',
        },
      }
    }

    // Použij DB funkci pro přehled
    const { data, error } = await supabase
      .rpc('get_tymy_overview', { p_zavod_id: zavodId })

    if (error) {
      // Fallback - ruční dotaz
      const { data: tymy, error: tymyError } = await supabase
        .from('tymy')
        .select('*')
        .eq('zavod_id', zavodId)
        .order('peg_cislo', { ascending: true, nullsFirst: false })

      if (tymyError) {
        return {
          success: false,
          error: {
            code: ErrorCodes.DATABASE_ERROR,
            message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          },
        }
      }

      // Manuálně spočítat statistiky
      const overview: TymOverview[] = await Promise.all(
        (tymy || []).map(async (tym) => {
          const { count: clenCount } = await supabase
            .from('clenove_tymu')
            .select('*', { count: 'exact', head: true })
            .eq('tym_id', tym.id)

          const { count: pozvankyCount } = await supabase
            .from('pozvanky')
            .select('*', { count: 'exact', head: true })
            .eq('tym_id', tym.id)

          const { count: registrovanychCount } = await supabase
            .from('pozvanky')
            .select('*', { count: 'exact', head: true })
            .eq('tym_id', tym.id)
            .eq('pouzita', true)

          return {
            tym_id: tym.id,
            nazev: tym.nazev,
            barva: tym.barva || '#3B82F6',
            peg_cislo: tym.peg_cislo,
            zaplaceno: tym.zaplaceno,
            pocet_clenu: clenCount || 0,
            pocet_pozvanek: pozvankyCount || 0,
            pocet_registrovanych: registrovanychCount || 0,
          }
        })
      )

      return { success: true, data: overview }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Získat detail týmu s členy
 */
export async function getTymDetail(tymId: string): Promise<ActionResult<TymWithClenove>> {
  try {
    const supabase = await createClient()

    // Získat tým
    const { data: tym, error: tymError } = await supabase
      .from('tymy')
      .select('*')
      .eq('id', tymId)
      .single()

    if (tymError || !tym) {
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
          message: 'Nemáte oprávnění pro přístup k týmu',
        },
      }
    }

    // Získat kapitána
    const { data: kapitan } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', tym.kapitan_id)
      .single()

    // Získat členy s profily
    const { data: clenove } = await supabase
      .from('clenove_tymu')
      .select(`
        id,
        tym_id,
        user_id,
        role,
        created_at,
        user:profiles(*)
      `)
      .eq('tym_id', tymId)

    return {
      success: true,
      data: {
        ...tym,
        kapitan: kapitan || undefined,
        clenove: (clenove || []).map(c => ({
          id: c.id,
          tym_id: c.tym_id,
          user_id: c.user_id,
          role: c.role,
          created_at: c.created_at,
          user: c.user as Profile | undefined,
        })),
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
 * Vytvořit nový tým
 */
export async function createTym(input: {
  zavodId: string
  nazev: string
  barva?: string
}): Promise<ActionResult<{ tymId: string }>> {
  try {
    const supabase = await createClient()

    const userId = await checkZavodAdminAccess(input.zavodId)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění vytvářet týmy',
        },
      }
    }

    if (!input.nazev || input.nazev.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Název týmu je povinný',
        },
      }
    }

    // Vložit tým (kapitan_id dočasně nastavíme na admina, bude změněn po přidání kapitána)
    const { data: tym, error } = await supabase
      .from('tymy')
      .insert({
        zavod_id: input.zavodId,
        nazev: input.nazev.trim(),
        kapitan_id: userId, // Dočasně admin
        barva: input.barva || '#3B82F6',
        zaplaceno: false,
      })
      .select('id')
      .single()

    if (error || !tym) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: error?.message },
        },
      }
    }

    return { success: true, data: { tymId: tym.id } }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Aktualizovat tým
 */
export async function updateTym(
  tymId: string,
  input: {
    nazev?: string
    barva?: string
    zaplaceno?: boolean
    peg_cislo?: number | null
  }
): Promise<ActionResult<Tym>> {
  try {
    const supabase = await createClient()

    // Získat tým pro kontrolu přístupu
    const { data: existingTym } = await supabase
      .from('tymy')
      .select('zavod_id')
      .eq('id', tymId)
      .single()

    if (!existingTym) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Tým nenalezen',
        },
      }
    }

    const userId = await checkZavodAdminAccess(existingTym.zavod_id)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění upravovat tým',
        },
      }
    }

    const { data: tym, error } = await supabase
      .from('tymy')
      .update(input)
      .eq('id', tymId)
      .select('*')
      .single()

    if (error || !tym) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: error?.message },
        },
      }
    }

    return { success: true, data: tym }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Smazat tým
 */
export async function deleteTym(tymId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Získat tým pro kontrolu přístupu
    const { data: existingTym } = await supabase
      .from('tymy')
      .select('zavod_id')
      .eq('id', tymId)
      .single()

    if (!existingTym) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Tým nenalezen',
        },
      }
    }

    const userId = await checkZavodAdminAccess(existingTym.zavod_id)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění mazat tým',
        },
      }
    }

    // Zkontroluj, zda tým nemá úlovky
    const { count: ulovkyCount } = await supabase
      .from('ulovky')
      .select('*', { count: 'exact', head: true })
      .eq('tym_id', tymId)

    if (ulovkyCount && ulovkyCount > 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Nelze smazat tým s registrovanými úlovky',
        },
      }
    }

    const { error } = await supabase
      .from('tymy')
      .delete()
      .eq('id', tymId)

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

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Losovat pegy pro závod
 */
export async function losujPegy(zavodId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění losovat pegy',
        },
      }
    }

    // Získat všechny týmy závodu
    const { data: tymy, error: tymyError } = await supabase
      .from('tymy')
      .select('id')
      .eq('zavod_id', zavodId)

    if (tymyError || !tymy || tymy.length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Závod nemá žádné týmy',
        },
      }
    }

    // Fisher-Yates shuffle
    const shuffled = [...tymy]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Přiřadit pegy
    for (let i = 0; i < shuffled.length; i++) {
      const { error: updateError } = await supabase
        .from('tymy')
        .update({ peg_cislo: i + 1 })
        .eq('id', shuffled[i].id)

      if (updateError) {
        return {
          success: false,
          error: {
            code: ErrorCodes.DATABASE_ERROR,
            message: `Chyba při přiřazení pegu týmu ${i + 1}`,
          },
        }
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
