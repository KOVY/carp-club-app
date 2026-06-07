'use server'
// @ts-nocheck

/**
 * Tým Server Actions
 *
 * Akce pro správu týmů:
 * - Vytvoření týmu s barvou
 * - Přidání/odebrání členů
 * - Aktualizace týmu
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import { isSystemAdmin } from '@/lib/constants'
import type {
  ActionResult,
  Tym,
  TymOverview,
  Profile,
  ClenTymuWithUser,
  UserRole,
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

  // Centralized system admin check first
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
    const adminClient = createAdminClient()

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
    const { data, error } = await (adminClient
      .rpc as any)('get_tymy_overview', { p_zavod_id: zavodId })

    if (error) {
      // Fallback - ruční dotaz
      const { data: tymyData, error: tymyError } = await adminClient
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

      const tymy = tymyData as Array<{
        id: string
        nazev: string
        barva: string | null
        peg_cislo: number | null
        zaplaceno: boolean
      }> | null

      // Manuálně spočítat statistiky
      const overview: TymOverview[] = await Promise.all(
        (tymy || []).map(async (tym) => {
          const { count: clenCount } = await adminClient
            .from('clenove_tymu')
            .select('*', { count: 'exact', head: true })
            .eq('tym_id', tym.id)

          const { count: pozvankyCount } = await adminClient
            .from('pozvanky')
            .select('*', { count: 'exact', head: true })
            .eq('tym_id', tym.id)

          const { count: registrovanychCount } = await adminClient
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
    const adminClient = createAdminClient()

    // Získat tým
    const { data: tymData, error: tymError } = await adminClient
      .from('tymy')
      .select('*')
      .eq('id', tymId)
      .single()

    const tym = tymData as {
      id: string
      nazev: string
      zavod_id: string
      kapitan_id: string
      barva: string | null
      peg_cislo: number | null
      sektor_id: string | null
      zaplaceno: boolean
      variabilni_symbol: string | null
      created_at: string
      updated_at: string
    } | null

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

    // Získat kapitána (email/telefon ponecháno — pořadatel vidí kontakty v admin UI)
    // kapitan_id může být NULL — účet kapitána mohl být smazán (ON DELETE SET NULL)
    let kapitan = null
    if (tym.kapitan_id) {
      const { data } = await adminClient
        .from('profiles')
        .select('id, jmeno, email, telefon')
        .eq('id', tym.kapitan_id)
        .single()
      kapitan = data
    }

    // Získat členy s profily (email ponecháno — zobrazuje se v admin UI)
    const { data: clenoveData } = await adminClient
      .from('clenove_tymu')
      .select(`
        id,
        tym_id,
        user_id,
        role,
        created_at,
        user:profiles(id, jmeno, email)
      `)
      .eq('tym_id', tymId)

    const clenove = clenoveData as Array<{
      id: string
      tym_id: string
      user_id: string
      role: UserRole
      created_at: string
      user: any
    }> | null

    return {
      success: true,
      data: {
        ...tym,
        barva: tym.barva || '#3B82F6',
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
 * Používá admin client pro obejití RLS
 */
export async function createTym(input: {
  zavodId: string
  nazev: string
  barva?: string
  zaplaceno?: boolean
}): Promise<ActionResult<{ tymId: string }>> {
  try {
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

    // Použít admin client pro obejití RLS
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

    // Vložit tým (kapitan_id dočasně nastavíme na admina, bude změněn po přidání kapitána)
    const { data: tymData, error } = await adminClient
      .from('tymy')
      .insert({
        zavod_id: input.zavodId,
        nazev: input.nazev.trim(),
        kapitan_id: userId, // Dočasně admin
        barva: input.barva || '#3B82F6',
        zaplaceno: input.zaplaceno ?? false,
      } as any)
      .select('id')
      .single()

    const tym = tymData as { id: string } | null

    if (error || !tym) {
      console.error('[createTym] Insert error:', error)
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
    const adminClient = createAdminClient()

    // Získat tým pro kontrolu přístupu
    const { data: existingTymData } = await adminClient
      .from('tymy')
      .select('zavod_id')
      .eq('id', tymId)
      .single()

    const existingTym = existingTymData as { zavod_id: string } | null

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

    const { data: tym, error } = await (adminClient
      .from('tymy') as any)
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
    const adminClient = createAdminClient()

    // Získat tým pro kontrolu přístupu
    const { data: existingTymDeleteData } = await adminClient
      .from('tymy')
      .select('zavod_id')
      .eq('id', tymId)
      .single()

    const existingTymDelete = existingTymDeleteData as { zavod_id: string } | null

    if (!existingTymDelete) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Tým nenalezen',
        },
      }
    }

    const userId = await checkZavodAdminAccess(existingTymDelete.zavod_id)
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
    const { count: ulovkyCount } = await adminClient
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

    const { error } = await adminClient
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
    const adminClient = createAdminClient()

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
    const { data: tymyLosData, error: tymyError } = await adminClient
      .from('tymy')
      .select('id')
      .eq('zavod_id', zavodId)

    const tymy = tymyLosData as Array<{ id: string }> | null

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
      const { error: updateError } = await (adminClient
        .from('tymy') as any)
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

/**
 * Získat seznam závodů pro kopírování týmů
 * Vrací závody s počtem týmů (pro dropdown)
 */
export async function getZavodyForCopy(): Promise<ActionResult<Array<{
  id: string
  nazev: string
  pocet_tymu: number
  datum_start: string
}>>> {
  try {
    const adminClient = createAdminClient()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Musíte být přihlášen',
        },
      }
    }

    // Získat všechny závody s počtem týmů
    const { data: zavodyData, error } = await adminClient
      .from('zavody')
      .select('id, nazev, datum_start')
      .order('datum_start', { ascending: false })

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Nepodařilo se načíst závody',
        },
      }
    }

    const zavody = zavodyData as Array<{ id: string; nazev: string; datum_start: string }> | null

    // Spočítat týmy pro každý závod
    const result = await Promise.all(
      (zavody || []).map(async (zavod) => {
        const { count } = await adminClient
          .from('tymy')
          .select('*', { count: 'exact', head: true })
          .eq('zavod_id', zavod.id)

        return {
          id: zavod.id,
          nazev: zavod.nazev,
          datum_start: zavod.datum_start,
          pocet_tymu: count || 0,
        }
      })
    )

    // Filtrovat jen závody s týmy
    const zavodyWithTeams = result.filter(z => z.pocet_tymu > 0)

    return { success: true, data: zavodyWithTeams }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Kopírovat týmy z jednoho závodu do druhého
 */
export async function copyTeamsFromZavod(
  sourceZavodId: string,
  targetZavodId: string
): Promise<ActionResult<{ teamsCopied: number; membersCopied: number }>> {
  try {
    const adminClient = createAdminClient()

    // Ověřit přístup k cílovému závodu
    const userId = await checkZavodAdminAccess(targetZavodId)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění upravovat cílový závod',
        },
      }
    }

    // Ověřit, že zdrojový závod existuje
    const { data: sourceZavod, error: sourceError } = await adminClient
      .from('zavody')
      .select('id, nazev')
      .eq('id', sourceZavodId)
      .single()

    if (sourceError || !sourceZavod) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Zdrojový závod nenalezen',
        },
      }
    }

    // Získat všechny týmy ze zdrojového závodu
    const { data: sourceTymyData, error: tymyError } = await adminClient
      .from('tymy')
      .select('*')
      .eq('zavod_id', sourceZavodId)

    const sourceTymy = sourceTymyData as Array<{
      id: string
      nazev: string
      kapitan_id: string | null
      barva: string | null
    }> | null

    if (tymyError || !sourceTymy || sourceTymy.length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Zdrojový závod nemá žádné týmy',
        },
      }
    }

    let teamsCopied = 0
    let membersCopied = 0

    // Kopírovat každý tým
    for (const sourceTym of sourceTymy) {
      // Vytvořit nový tým v cílovém závodě
      const { data: newTym, error: createError } = await (adminClient
        .from('tymy') as any)
        .insert({
          zavod_id: targetZavodId,
          nazev: sourceTym.nazev,
          kapitan_id: sourceTym.kapitan_id,
          barva: sourceTym.barva,
          // peg_cislo se nepřenáší - bude losováno znovu
          // zaplaceno se nepřenáší - nový závod, nová platba
        })
        .select('id')
        .single()

      if (createError || !newTym) {
        console.error(`[copyTeams] Chyba při kopírování týmu ${sourceTym.nazev}:`, createError)
        continue
      }

      teamsCopied++

      // Získat členy zdrojového týmu
      const { data: sourceClenoveData } = await adminClient
        .from('clenove_tymu')
        .select('user_id, role')
        .eq('tym_id', sourceTym.id)

      const sourceClenove = sourceClenoveData as Array<{ user_id: string; role: string }> | null

      // Kopírovat členy
      for (const clen of (sourceClenove || [])) {
        await (adminClient.from('clenove_tymu') as any).insert({
          tym_id: newTym.id,
          user_id: clen.user_id,
          role: clen.role,
        })

        // Přidat zavod_role pro člena
        await (adminClient.from('zavod_role') as any).upsert({
          zavod_id: targetZavodId,
          user_id: clen.user_id,
          role: clen.role,
        }, { onConflict: 'zavod_id,user_id' })

        membersCopied++
      }
    }

    return {
      success: true,
      data: {
        teamsCopied,
        membersCopied,
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
 * Aktualizovat GPS souřadnice pegu týmu
 * Používá se pro nastavení pozice na mapě
 */
export async function updateTymPegLocation(
  tymId: string,
  input: { peg_lat?: number | null; peg_lng?: number | null }
): Promise<ActionResult<void>> {
  try {
    const adminClient = createAdminClient()

    // Získat závod_id z týmu pro kontrolu oprávnění
    const { data: tymData, error: tymError } = await adminClient
      .from('tymy')
      .select('zavod_id')
      .eq('id', tymId)
      .single()

    if (tymError || !tymData) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Tým nenalezen',
        },
      }
    }

    const tym = tymData as { zavod_id: string }

    // Ověřit přístup k závodu
    const userId = await checkZavodAdminAccess(tym.zavod_id)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění upravovat tým',
        },
      }
    }

    // Aktualizovat GPS souřadnice
    const { error: updateError } = await (adminClient
      .from('tymy') as any)
      .update({
        peg_lat: input.peg_lat,
        peg_lng: input.peg_lng,
      })
      .eq('id', tymId)

    if (updateError) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Nepodařilo se aktualizovat pozici pegu',
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
 * Přidat REGISTROVANÉHO uživatele do týmu (bez e-mailové pozvánky).
 * Pořadatel vyhledá uživatele (hledatUzivatele) a přiřadí ho do týmu jako závodníka/kapitána.
 * Zapisuje do clenove_tymu i zavod_role (role je nutná pro oprávnění v UI, např. přidání úlovku).
 */
export async function pridatClenaDoTymu(
  tymId: string,
  targetUserId: string,
  role: 'zavodnik' | 'kapitan' = 'zavodnik',
): Promise<ActionResult<void>> {
  try {
    const adminClient = createAdminClient()
    const { data: tym } = await adminClient.from('tymy').select('id, zavod_id').eq('id', tymId).single()
    if (!tym) return { success: false, error: { code: ErrorCodes.NOT_FOUND, message: 'Tým nenalezen' } }
    const zavodId = (tym as { zavod_id: string }).zavod_id
    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: 'Nemáš oprávnění spravovat tento závod' } }

    // Uživatel nesmí být už v jiném týmu téhož závodu.
    const { data: zavodTymy } = await adminClient.from('tymy').select('id').eq('zavod_id', zavodId)
    const tymIds = ((zavodTymy ?? []) as Array<{ id: string }>).map((t) => t.id)
    if (tymIds.length > 0) {
      const { data: existing } = await adminClient.from('clenove_tymu').select('tym_id').eq('user_id', targetUserId).in('tym_id', tymIds)
      if (existing && existing.length > 0) {
        return { success: false, error: { code: ErrorCodes.INVALID_INPUT, message: 'Uživatel už je členem některého týmu v tomto závodě.' } }
      }
    }

    const { error: clenErr } = await (adminClient.from('clenove_tymu') as any).insert({ tym_id: tymId, user_id: targetUserId, role })
    if (clenErr) return { success: false, error: { code: ErrorCodes.DATABASE_ERROR, message: clenErr.message } }
    await (adminClient.from('zavod_role') as any).upsert({ zavod_id: zavodId, user_id: targetUserId, role }, { onConflict: 'zavod_id,user_id', ignoreDuplicates: true })
    return { success: true }
  } catch (error) {
    return { success: false, error: toErrorResponse(error) }
  }
}

/** Odebrat člena z týmu (a jeho roli závodníka/kapitána v závodě; pořadatele/rozhodčího neodebírá). */
export async function odebratClenaZTymu(tymId: string, targetUserId: string): Promise<ActionResult<void>> {
  try {
    const adminClient = createAdminClient()
    const { data: tym } = await adminClient.from('tymy').select('id, zavod_id').eq('id', tymId).single()
    if (!tym) return { success: false, error: { code: ErrorCodes.NOT_FOUND, message: 'Tým nenalezen' } }
    const zavodId = (tym as { zavod_id: string }).zavod_id
    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: 'Nemáš oprávnění spravovat tento závod' } }

    await (adminClient.from('clenove_tymu') as any).delete().eq('tym_id', tymId).eq('user_id', targetUserId)
    await (adminClient.from('zavod_role') as any).delete().eq('zavod_id', zavodId).eq('user_id', targetUserId).in('role', ['zavodnik', 'kapitan'])
    return { success: true }
  } catch (error) {
    return { success: false, error: toErrorResponse(error) }
  }
}
