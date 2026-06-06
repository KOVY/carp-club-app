// @ts-nocheck
'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import { isSystemAdmin } from '@/lib/constants'
import { resolvePrihlaskaStav } from '@/lib/prihlasky-logic'
import type { ActionResult, Prihlaska } from '@/lib/types'

/** Scope check: vrací userId pořadatele/admina daného závodu, jinak null. */
async function checkZavodAdminAccess(zavodId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (isSystemAdmin(user.id)) return user.id
  const { data: isSys } = await (supabase as any).rpc('is_system_admin', { p_user_id: user.id })
  if (isSys === true) return user.id
  const { data: roles } = await supabase.from('zavod_role').select('role')
    .eq('zavod_id', zavodId).eq('user_id', user.id).in('role', ['poradatel', 'hlavni_admin'])
  return (roles && roles.length > 0) ? user.id : null
}

/**
 * Interní: auto-přijetí — vytvoří tým pro přihlášku, přidá kapitána do clenove_tymu
 * a označí přihlášku jako schválenou. Běží přes adminClient (service role), proto ho
 * smí spustit i samotný závodník (obchází admin-guard v createTym). Vrací tymId nebo null.
 */
async function vytvoritTymProPrihlasku(
  adminClient: any,
  prihlaska: { id: string; zavod_id: string; nazev_tymu: string; kapitan_user_id: string },
): Promise<string | null> {
  const variabilniSymbol = `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
  const { data: tym, error } = await adminClient.from('tymy').insert({
    zavod_id: prihlaska.zavod_id,
    nazev: prihlaska.nazev_tymu,
    kapitan_id: prihlaska.kapitan_user_id,
    variabilni_symbol: variabilniSymbol,
  }).select('id').single()
  if (error || !tym) { console.error('[vytvoritTymProPrihlasku] tym insert:', error?.message); return null }
  const tymId = (tym as { id: string }).id
  const { error: memberErr } = await adminClient.from('clenove_tymu').insert({
    tym_id: tymId, user_id: prihlaska.kapitan_user_id, role: 'kapitan',
  })
  if (memberErr) console.error('[vytvoritTymProPrihlasku] clen insert:', memberErr.message)
  await adminClient.from('prihlasky').update({
    stav: 'schvaleno', tym_id: tymId, poradi_nahradnika: null, updated_at: new Date().toISOString(),
  }).eq('id', prihlaska.id)
  return tymId
}

/** Rybář se přihlásí na závod (založí tým jako kapitán). */
export async function prihlasitNaZavod(
  zavodId: string, input: { nazevTymu: string; clenove?: string },
): Promise<ActionResult<{ prihlaskaId: string; stav: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    if (!input.nazevTymu?.trim()) return { success: false, error: { code: ErrorCodes.INVALID_INPUT, message: 'Zadej název týmu' } }

    const adminClient = createAdminClient()
    const { data: zavod } = await adminClient.from('zavody').select('pocet_pegu').eq('id', zavodId).single()
    if (!zavod) return { success: false, error: { code: ErrorCodes.ZAVOD_NOT_FOUND, message: ErrorMessages[ErrorCodes.ZAVOD_NOT_FOUND] } }
    const { count: obsazenost } = await adminClient.from('prihlasky').select('id', { count: 'exact', head: true })
      .eq('zavod_id', zavodId).in('stav', ['prihlasen', 'schvaleno'])
    const { data: nahr } = await adminClient.from('prihlasky').select('poradi_nahradnika')
      .eq('zavod_id', zavodId).eq('stav', 'nahradnik').order('poradi_nahradnika', { ascending: false }).limit(1)
    const maxPoradi = (nahr?.[0]?.poradi_nahradnika as number) ?? 0
    const { stav, poradi } = resolvePrihlaskaStav(obsazenost ?? 0, (zavod as any).pocet_pegu ?? null, maxPoradi)

    const { data: created, error } = await (adminClient.from('prihlasky') as any).insert({
      zavod_id: zavodId, kapitan_user_id: user.id, nazev_tymu: input.nazevTymu.trim(),
      clenove: input.clenove?.trim() || null, stav, poradi_nahradnika: poradi,
    }).select('id').single()
    if (error) {
      if (error.code === '23505') return { success: false, error: { code: ErrorCodes.ALREADY_REGISTERED, message: ErrorMessages[ErrorCodes.ALREADY_REGISTERED] } }
      return { success: false, error: { code: ErrorCodes.DATABASE_ERROR, message: error.message } }
    }
    // Auto-přijetí: do naplnění kapacity rovnou vytvoříme tým a schválíme (bez zásahu pořadatele).
    let finalStav: string = stav
    if (stav === 'prihlasen') {
      const tymId = await vytvoritTymProPrihlasku(adminClient, {
        id: created.id, zavod_id: zavodId, nazev_tymu: input.nazevTymu.trim(), kapitan_user_id: user.id,
      })
      if (tymId) finalStav = 'schvaleno'
    }
    return { success: true, data: { prihlaskaId: created.id, stav: finalStav } }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Rybář zruší svou přihlášku; pokud byl přihlášen, první náhradník postoupí. */
export async function zrusitPrihlasku(prihlaskaId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    const adminClient = createAdminClient()
    const { data: p } = await adminClient.from('prihlasky').select('*').eq('id', prihlaskaId).single()
    if (!p) return { success: false, error: { code: ErrorCodes.NOT_FOUND, message: ErrorMessages[ErrorCodes.NOT_FOUND] } }
    if ((p as any).kapitan_user_id !== user.id) return { success: false, error: { code: ErrorCodes.FORBIDDEN, message: ErrorMessages[ErrorCodes.FORBIDDEN] } }
    await (adminClient.from('prihlasky') as any).update({ stav: 'zruseno', updated_at: new Date().toISOString() }).eq('id', prihlaskaId)
    if ((p as any).stav === 'prihlasen') await promoteNahradnik(adminClient, (p as any).zavod_id)
    return { success: true }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Interní: první náhradník postoupí (auto-přijetí → rovnou tým + schváleno) a zbytek se přečísluje. */
async function promoteNahradnik(adminClient: any, zavodId: string): Promise<void> {
  const { data: first } = await adminClient.from('prihlasky').select('id, zavod_id, nazev_tymu, kapitan_user_id')
    .eq('zavod_id', zavodId).eq('stav', 'nahradnik').order('poradi_nahradnika', { ascending: true }).limit(1)
  if (!first || first.length === 0) return
  const p = first[0]
  await vytvoritTymProPrihlasku(adminClient, {
    id: p.id, zavod_id: p.zavod_id, nazev_tymu: p.nazev_tymu, kapitan_user_id: p.kapitan_user_id,
  })
  const { data: rest } = await adminClient.from('prihlasky').select('id, poradi_nahradnika')
    .eq('zavod_id', zavodId).eq('stav', 'nahradnik').order('poradi_nahradnika', { ascending: true })
  for (const r of rest ?? []) await adminClient.from('prihlasky').update({ poradi_nahradnika: r.poradi_nahradnika - 1 }).eq('id', r.id)
}

/** Rybář: moje přihlášky. */
export async function getMojePrihlasky(): Promise<ActionResult<Prihlaska[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: true, data: [] }
    const adminClient = createAdminClient()
    const { data } = await adminClient.from('prihlasky').select('*').eq('kapitan_user_id', user.id).neq('stav', 'zruseno')
    return { success: true, data: (data ?? []) as Prihlaska[] }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Pořadatel: seznam přihlášek závodu (přihlášení + náhradníci). */
export async function getPrihlaskyZavodu(zavodId: string): Promise<ActionResult<Prihlaska[]>> {
  try {
    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    const adminClient = createAdminClient()
    const { data } = await adminClient.from('prihlasky').select('*').eq('zavod_id', zavodId)
      .neq('stav', 'zruseno').order('created_at', { ascending: true })
    return { success: true, data: (data ?? []) as Prihlaska[] }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Pořadatel: schválí přihlášku → vytvoří tým. */
export async function schvalitPrihlasku(prihlaskaId: string): Promise<ActionResult<{ tymId: string }>> {
  try {
    const adminClient = createAdminClient()
    const { data: p } = await adminClient.from('prihlasky').select('*').eq('id', prihlaskaId).single()
    if (!p) return { success: false, error: { code: ErrorCodes.NOT_FOUND, message: ErrorMessages[ErrorCodes.NOT_FOUND] } }
    const userId = await checkZavodAdminAccess((p as any).zavod_id)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    const { createTym } = await import('@/actions/admin.actions')
    const res = await createTym({ zavodId: (p as any).zavod_id, nazev: (p as any).nazev_tymu, kapitanId: (p as any).kapitan_user_id })
    if (!res.success) return res as any
    await (adminClient.from('prihlasky') as any).update({ stav: 'schvaleno', tym_id: res.data!.tymId, updated_at: new Date().toISOString() }).eq('id', prihlaskaId)
    // I2: pokud byl schvalovaný náhradník, přečísluj zbylé náhradníky s vyšším pořadím o -1
    if ((p as any).stav === 'nahradnik') {
      const { data: rest } = await adminClient.from('prihlasky').select('id, poradi_nahradnika')
        .eq('zavod_id', (p as any).zavod_id).eq('stav', 'nahradnik')
        .gt('poradi_nahradnika', (p as any).poradi_nahradnika)
      for (const r of rest ?? []) await adminClient.from('prihlasky').update({ poradi_nahradnika: r.poradi_nahradnika - 1 }).eq('id', r.id)
    }
    return { success: true, data: { tymId: res.data!.tymId } }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Pořadatel: odhlásí přihlášku; náhradník postoupí. */
export async function odebratPrihlasku(prihlaskaId: string): Promise<ActionResult> {
  try {
    const adminClient = createAdminClient()
    const { data: p } = await adminClient.from('prihlasky').select('*').eq('id', prihlaskaId).single()
    if (!p) return { success: false, error: { code: ErrorCodes.NOT_FOUND, message: ErrorMessages[ErrorCodes.NOT_FOUND] } }
    const userId = await checkZavodAdminAccess((p as any).zavod_id)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    await (adminClient.from('prihlasky') as any).update({ stav: 'zruseno', updated_at: new Date().toISOString() }).eq('id', prihlaskaId)
    if ((p as any).stav === 'prihlasen') await promoteNahradnik(adminClient, (p as any).zavod_id)
    return { success: true }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Pořadatel: nastaví počet pegů (kapacitu) závodu. */
export async function nastavitPocetPegu(zavodId: string, pocet: number | null): Promise<ActionResult> {
  try {
    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    const adminClient = createAdminClient()
    await (adminClient.from('zavody') as any).update({ pocet_pegu: pocet }).eq('id', zavodId)
    return { success: true }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}
