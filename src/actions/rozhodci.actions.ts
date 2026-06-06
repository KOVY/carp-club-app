// @ts-nocheck
'use server'
/**
 * Rozhodčí — přiřazení role registrovanému uživateli (bez emailových pozvánek).
 * Nahrazuje starý pozvánkový tok: rozhodčí se zaregistruje sám jako každý jiný a
 * pořadatel mu jen přiřkne roli 'rozhodci' v daném závodě.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import { isSystemAdmin } from '@/lib/constants'
import type { ActionResult } from '@/lib/types'

export interface RozhodciUzivatel {
  userId: string
  jmeno: string
  email: string
}

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

/** Seznam rozhodčích závodu (z zavod_role + profil). */
export async function getRozhodciZavodu(zavodId: string): Promise<ActionResult<RozhodciUzivatel[]>> {
  try {
    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    const adminClient = createAdminClient()
    const { data: roles } = await adminClient.from('zavod_role').select('user_id')
      .eq('zavod_id', zavodId).eq('role', 'rozhodci')
    const ids = (roles ?? []).map((r: any) => r.user_id)
    if (ids.length === 0) return { success: true, data: [] }
    const { data: profiles } = await adminClient.from('profiles').select('id, jmeno, email').in('id', ids)
    return { success: true, data: (profiles ?? []).map((p: any) => ({ userId: p.id, jmeno: p.jmeno, email: p.email })) }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Vyhledá registrované uživatele podle jména/emailu (pro přiřazení role rozhodčího). */
export async function hledatUzivatele(zavodId: string, query: string): Promise<ActionResult<RozhodciUzivatel[]>> {
  try {
    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    // Sanitizace — znaky, které by rozbily PostgREST .or() filtr, pryč.
    const safe = query.replace(/[,()*:\\%]/g, '').trim()
    if (safe.length < 2) return { success: true, data: [] }
    const adminClient = createAdminClient()
    const { data: profiles } = await adminClient.from('profiles').select('id, jmeno, email')
      .or(`jmeno.ilike.%${safe}%,email.ilike.%${safe}%`).limit(10)
    return { success: true, data: (profiles ?? []).map((p: any) => ({ userId: p.id, jmeno: p.jmeno, email: p.email })) }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Přiřadí roli rozhodčího registrovanému uživateli (bez emailu). */
export async function prirazitRozhodci(zavodId: string, targetUserId: string): Promise<ActionResult> {
  try {
    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    const adminClient = createAdminClient()
    // Nepřepisuj pořadatele/hlavního admina nedopatřením.
    const { data: existing } = await adminClient.from('zavod_role').select('role')
      .eq('zavod_id', zavodId).eq('user_id', targetUserId).single()
    if (existing && ['poradatel', 'hlavni_admin'].includes((existing as any).role)) {
      return { success: false, error: { code: ErrorCodes.INVALID_INPUT, message: 'Uživatel už má vyšší roli (pořadatel/admin) v tomto závodě.' } }
    }
    const { error } = await adminClient.from('zavod_role')
      .upsert({ zavod_id: zavodId, user_id: targetUserId, role: 'rozhodci' }, { onConflict: 'zavod_id,user_id' })
    if (error) return { success: false, error: { code: ErrorCodes.DATABASE_ERROR, message: error.message } }
    return { success: true }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Odebere rozhodčímu roli pro daný závod. */
export async function odebratRozhodci(zavodId: string, targetUserId: string): Promise<ActionResult> {
  try {
    const userId = await checkZavodAdminAccess(zavodId)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    const adminClient = createAdminClient()
    const { error } = await adminClient.from('zavod_role').delete()
      .eq('zavod_id', zavodId).eq('user_id', targetUserId).eq('role', 'rozhodci')
    if (error) return { success: false, error: { code: ErrorCodes.DATABASE_ERROR, message: error.message } }
    return { success: true }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}
