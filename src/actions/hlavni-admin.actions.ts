'use server'
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Hlavní Admin Server Actions
 *
 * Akce pro hlavního administrátora (hlavni_admin):
 * - Správa všech závodů
 * - Vytváření nových závodů
 * - Přehled statistik
 *
 * Note: Using 'any' type assertions due to Supabase generated types mismatch
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import type {
  ActionResult,
  CreateZavodInput,
  UpdateZavodInput,
  Zavod,
  ZavodStats,
} from '@/lib/types'

/**
 * Kontrola, zda je uživatel hlavní admin nebo pořadatel
 * Nejprve kontroluje hardcoded admin, pak system_admins tabulku
 */
async function checkAdminAccess(): Promise<{ userId: string; isHlavniAdmin: boolean } | null> {
  // Hardcoded admin user ID as fallback (prorybolov@gmail.com)
  const ADMIN_USER_ID = 'adfa3aa5-9e63-4a0b-8dac-f1f5911bcf25'

  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return null
  }

  // Hardcoded admin check first
  if (user.id === ADMIN_USER_ID) {
    return { userId: user.id, isHlavniAdmin: true }
  }

  // Nejprve zkontroluj system_admins (globální admin)
  const { data: systemAdmin } = await supabase
    .from('system_admins')
    .select('id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (systemAdmin) {
    // Systémový admin má plná práva
    return { userId: user.id, isHlavniAdmin: true }
  }

  // Pak zkontroluj zavod_role tabulku
  const { data: roles } = await supabase
    .from('zavod_role')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['hlavni_admin', 'poradatel'])

  if (!roles || roles.length === 0) {
    return null
  }

  const isHlavniAdmin = roles.some((r: { role: string }) => r.role === 'hlavni_admin')

  return { userId: user.id, isHlavniAdmin }
}

/**
 * Získat všechny závody (pro hlavního admina)
 */
export async function getAllZavody(): Promise<ActionResult<Zavod[]>> {
  try {
    const adminClient = createAdminClient()

    const access = await checkAdminAccess()
    if (!access) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění pro přístup k admin sekci',
        },
      }
    }

    let query = adminClient
      .from('zavody')
      .select('*')
      .order('datum_start', { ascending: false })

    // Pokud není hlavní admin, zobraz jen jeho závody
    if (!access.isHlavniAdmin) {
      const { data: userZavody } = await adminClient
        .from('zavod_role')
        .select('zavod_id')
        .eq('user_id', access.userId)
        .eq('role', 'poradatel')

      if (userZavody && userZavody.length > 0) {
        const zavodIds = userZavody.map((z: { zavod_id: string }) => z.zavod_id)
        query = query.in('id', zavodIds)
      } else {
        return { success: true, data: [] }
      }
    }

    const { data: zavody, error } = await query

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

    return { success: true, data: zavody || [] }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Získat detail závodu se statistikami
 */
export async function getZavodDetail(zavodId: string): Promise<ActionResult<{
  zavod: Zavod
  stats: ZavodStats
}>> {
  try {
    const adminClient = createAdminClient()

    const access = await checkAdminAccess()
    if (!access) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění pro přístup k admin sekci',
        },
      }
    }

    // Získat závod
    const { data: zavod, error: zavodError } = await adminClient
      .from('zavody')
      .select('*')
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

    // Získat statistiky pomocí přímých dotazů
    const [
      { count: pocetTymu },
      { count: pocetClenu },
      { count: pocetPozvanek },
      { count: pocetRegistrovanych },
      { count: pocetUlovku },
      { count: pocetPotvrzenych },
      { count: pocetZlutychKaret },
    ] = await Promise.all([
      adminClient.from('tymy').select('*', { count: 'exact', head: true }).eq('zavod_id', zavodId),
      adminClient.from('clenove_tymu').select('*', { count: 'exact', head: true })
        .in('tym_id', (await adminClient.from('tymy').select('id').eq('zavod_id', zavodId)).data?.map((t: { id: string }) => t.id) || []),
      adminClient.from('pozvanky').select('*', { count: 'exact', head: true }).eq('zavod_id', zavodId),
      adminClient.from('pozvanky').select('*', { count: 'exact', head: true }).eq('zavod_id', zavodId).eq('pouzita', true),
      adminClient.from('ulovky').select('*', { count: 'exact', head: true }).eq('zavod_id', zavodId),
      adminClient.from('ulovky').select('*', { count: 'exact', head: true }).eq('zavod_id', zavodId).eq('potvrzeno', true),
      adminClient.from('zlute_karty').select('*', { count: 'exact', head: true }).eq('zavod_id', zavodId),
    ])

    const stats: ZavodStats = {
      pocet_tymu: pocetTymu || 0,
      pocet_clenu: pocetClenu || 0,
      pocet_pozvanek: pocetPozvanek || 0,
      pocet_registrovanych: pocetRegistrovanych || 0,
      pocet_ulovku: pocetUlovku || 0,
      pocet_potvrzenych: pocetPotvrzenych || 0,
      pocet_zlutych_karet: pocetZlutychKaret || 0,
    }

    return { success: true, data: { zavod, stats } }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Vytvořit nový závod (pro hlavního admina)
 * Používá admin client pro obejití RLS
 */
export async function createZavodAsAdmin(input: CreateZavodInput): Promise<ActionResult<{ zavodId: string }>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění vytvářet závody',
        },
      }
    }

    // Použít admin klient pro obejití RLS
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Chybí konfigurace pro vytváření závodů. Kontaktujte administrátora.',
        },
      }
    }

    // Validace
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

    // Vložit závod pomocí admin klienta
    const insertData = {
      nazev: nazev.trim(),
      misto: misto?.trim() || null,
      datum_start,
      datum_end,
      embargo_od: embargo_od || null,
      pravidla: pravidla || null,
      soutez_id: soutez_id || null,
      stav: 'priprava' as const,
      min_vaha_kg: input.min_vaha_kg ?? 5,
      top_n_ryb: input.top_n_ryb ?? 5,
      pocet_potvrzeni: input.pocet_potvrzeni ?? 2,
    }

    const { data: zavodData, error: insertError } = await adminClient
      .from('zavody')
      .insert(insertData as any)
      .select('id')
      .single()

    const zavodId = (zavodData as { id: string } | null)?.id

    if (insertError || !zavodId) {
      console.error('[createZavodAsAdmin] Insert error:', insertError)
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: insertError?.message },
        },
      }
    }

    // Přiřadit tvůrce jako pořadatele závodu
    const { error: roleError } = await adminClient
      .from('zavod_role')
      .insert({
        zavod_id: zavodId,
        user_id: access.userId,
        role: 'poradatel',
      } as any)

    if (roleError) {
      console.error('[createZavodAsAdmin] Role error:', roleError)
      // Zkusíme smazat závod pokud se nepodařilo přidat roli
      await adminClient.from('zavody').delete().eq('id', zavodId)
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Nepodařilo se přiřadit roli pořadatele',
          details: { originalError: roleError.message },
        },
      }
    }

    return { success: true, data: { zavodId } }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Aktualizovat závod
 */
export async function updateZavodAsAdmin(
  zavodId: string,
  input: UpdateZavodInput
): Promise<ActionResult<Zavod>> {
  try {
    const adminClient = createAdminClient()

    const access = await checkAdminAccess()
    if (!access) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění upravovat závody',
        },
      }
    }

    // Zkontroluj, zda má přístup k tomuto závodu
    if (!access.isHlavniAdmin) {
      const { data: hasAccess } = await adminClient
        .from('zavod_role')
        .select('id')
        .eq('zavod_id', zavodId)
        .eq('user_id', access.userId)
        .eq('role', 'poradatel')
        .single()

      if (!hasAccess) {
        return {
          success: false,
          error: {
            code: ErrorCodes.FORBIDDEN,
            message: 'Nemáte oprávnění upravovat tento závod',
          },
        }
      }
    }

    const { data: zavod, error } = await (adminClient
      .from('zavody') as any)
      .update(input)
      .eq('id', zavodId)
      .select('*')
      .single()

    if (error || !zavod) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
          details: { originalError: error?.message },
        },
      }
    }

    return { success: true, data: zavod }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Smazat závod včetně všech souvisejících dat
 * Kaskádově smaže: týmy, členy týmů, úlovky, pozvánky, role
 * Používá admin klient pro obejití RLS
 */
export async function deleteZavod(zavodId: string): Promise<ActionResult<void>> {
  try {
    // Ověření oprávnění
    const access = await checkAdminAccess()
    if (!access) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění mazat závody',
        },
      }
    }

    // Použít admin klient pro mazání (obchází RLS)
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Chybí konfigurace pro mazání. Kontaktujte administrátora.',
        },
      }
    }

    // Nejprve smaž všechny závislé záznamy v pořadí
    // 1. Smaž členy týmů (závisí na týmech)
    const { data: tymy } = await adminClient
      .from('tymy')
      .select('id')
      .eq('zavod_id', zavodId)

    if (tymy && tymy.length > 0) {
      const tymIds = tymy.map(t => (t as { id: string }).id)

      // Smaž členy týmů
      const { error: clenoviError } = await adminClient
        .from('clenove_tymu')
        .delete()
        .in('tym_id', tymIds)

      if (clenoviError) {
        console.error('Failed to delete team members:', clenoviError)
      }

      // Smaž úlovky
      const { error: ulovkyError } = await adminClient
        .from('ulovky')
        .delete()
        .in('tym_id', tymIds)

      if (ulovkyError) {
        console.error('Failed to delete catches:', ulovkyError)
      }
    }

    // 2. Smaž týmy
    const { error: tymyError } = await adminClient
      .from('tymy')
      .delete()
      .eq('zavod_id', zavodId)

    if (tymyError) {
      console.error('Failed to delete teams:', tymyError)
    }

    // 3. Smaž pozvánky
    const { error: pozvankyError } = await adminClient
      .from('pozvanky')
      .delete()
      .eq('zavod_id', zavodId)

    if (pozvankyError) {
      console.error('Failed to delete invitations:', pozvankyError)
    }

    // 4. Smaž role závodu
    const { error: roleError } = await adminClient
      .from('zavod_role')
      .delete()
      .eq('zavod_id', zavodId)

    if (roleError) {
      console.error('Failed to delete roles:', roleError)
    }

    // 5. Nakonec smaž samotný závod
    const { error } = await adminClient
      .from('zavody')
      .delete()
      .eq('id', zavodId)

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: `Nepodařilo se smazat závod: ${error.message}`,
        },
      }
    }

    return { success: true }
  } catch (error) {
    console.error('deleteZavod error:', error)
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Získat seznam soutěží pro dropdown
 */
export async function getSouteze(): Promise<ActionResult<{ id: string; nazev: string; rok: number }[]>> {
  try {
    const supabase = await createClient()

    const { data: souteze, error } = await supabase
      .from('souteze')
      .select('id, nazev, rok')
      .order('rok', { ascending: false })

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: ErrorMessages[ErrorCodes.DATABASE_ERROR],
        },
      }
    }

    return { success: true, data: souteze || [] }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Získat všechny čekající úlovky v závodě (pro admina)
 */
export async function getPendingUlovkyAdmin(zavodId: string): Promise<ActionResult<any[]>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění',
        },
      }
    }

    const adminClient = createAdminClient()

    const { data: ulovky, error } = await adminClient
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

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: error.message,
        },
      }
    }

    return { success: true, data: ulovky || [] }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Potvrdit úlovek jako admin/rozhodčí
 * Okamžitě nastaví stav na 'potvrzeno'
 */
export async function confirmUlovekAdmin(ulovekId: string): Promise<ActionResult<void>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění',
        },
      }
    }

    const adminClient = createAdminClient()

    // Update catch to confirmed
    const { error } = await (adminClient
      .from('ulovky') as any)
      .update({
        stav: 'potvrzeno',
        potvrzeno_rozhodcim: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ulovekId)

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: error.message,
        },
      }
    }

    // Log admin confirmation to audit log (don't insert to potvrzeni - admin has no team)
    await (adminClient
      .from('audit_log') as any)
      .insert({
        table_name: 'ulovky',
        record_id: ulovekId,
        action: 'ADMIN_CONFIRM',
        new_data: { stav: 'potvrzeno', potvrzeno_rozhodcim: true },
        user_id: access.userId,
      })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Zamítnout úlovek jako admin/rozhodčí
 */
export async function rejectUlovekAdmin(ulovekId: string, reason?: string): Promise<ActionResult<void>> {
  try {
    const access = await checkAdminAccess()
    if (!access) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění',
        },
      }
    }

    const adminClient = createAdminClient()

    // Update catch to rejected
    const { error } = await (adminClient
      .from('ulovky') as any)
      .update({
        stav: 'zamitnuto',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ulovekId)

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: error.message,
        },
      }
    }

    // Log admin rejection to audit log (don't insert to potvrzeni - admin has no team)
    await (adminClient
      .from('audit_log') as any)
      .insert({
        table_name: 'ulovky',
        record_id: ulovekId,
        action: 'ADMIN_REJECT',
        new_data: { stav: 'zamitnuto', reason: reason || 'Zamítnuto administrátorem' },
        user_id: access.userId,
      })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}
