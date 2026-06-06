'use server'
// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import { isSystemAdmin } from '@/lib/constants'
import type { ActionResult, Zprava } from '@/lib/types'

async function checkZavodAdminAccess(zavodId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (isSystemAdmin(user.id)) return user.id
  const { data: isSys } = await (supabase as any).rpc('is_system_admin', { p_user_id: user.id })
  if (isSys === true) return user.id
  const { data: roles } = await supabase.from('zavod_role').select('role')
    .eq('zavod_id', zavodId).eq('user_id', user.id).in('role', ['poradatel', 'hlavni_admin', 'rozhodci'])
  return (roles && roles.length > 0) ? user.id : null
}

/** Odeslat chatovou zprávu do závodu. */
export async function odeslatZpravu(input: { zavodId: string; text: string }): Promise<ActionResult<{ zpravaId: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    if (!input.text?.trim()) return { success: false, error: { code: ErrorCodes.INVALID_INPUT, message: 'Prázdná zpráva' } }
    const adminClient = createAdminClient()
    const { data, error } = await (adminClient.from('zpravy') as any).insert({
      zavod_id: input.zavodId, autor_user_id: user.id, typ: 'chat', text: input.text.trim(),
    }).select('id').single()
    if (error) return { success: false, error: { code: ErrorCodes.DATABASE_ERROR, message: error.message } }
    return { success: true, data: { zpravaId: data.id } }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Přivolat rozhodčího — vloží zprávu typu privolani s pegem uživatele. */
export async function privolatRozhodciho(zavodId: string): Promise<ActionResult<{ zpravaId: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    const adminClient = createAdminClient()
    const { data: teams } = await adminClient.from('tymy').select('id, peg_cislo').eq('zavod_id', zavodId)
    const teamIds = (teams ?? []).map((t: any) => t.id)
    let peg: number | null = null
    if (teamIds.length > 0) {
      const { data: membership } = await adminClient.from('clenove_tymu').select('tym_id').eq('user_id', user.id).in('tym_id', teamIds).maybeSingle()
      if (membership) peg = (teams as any[]).find(t => t.id === (membership as any).tym_id)?.peg_cislo ?? null
    }
    const { data, error } = await (adminClient.from('zpravy') as any).insert({
      zavod_id: zavodId, autor_user_id: user.id, typ: 'privolani', peg_cislo: peg, vyrizeno: false,
    }).select('id').single()
    if (error) return { success: false, error: { code: ErrorCodes.DATABASE_ERROR, message: error.message } }
    return { success: true, data: { zpravaId: data.id } }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Načíst zprávy závodu (s jménem autora). */
export async function getZpravy(zavodId: string): Promise<ActionResult<Zprava[]>> {
  try {
    const adminClient = createAdminClient()
    const { data } = await adminClient.from('zpravy')
      .select('*, autor:profiles!zpravy_autor_user_id_fkey(jmeno)')
      .eq('zavod_id', zavodId).order('created_at', { ascending: true }).limit(200)
    const zpravy = (data ?? []).map((z: any) => ({ ...z, autor_jmeno: z.autor?.jmeno ?? 'Neznámý' }))
    return { success: true, data: zpravy as Zprava[] }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}

/** Rozhodčí: vyřídit přivolání. */
export async function vyriditPrivolani(zpravaId: string): Promise<ActionResult> {
  try {
    const adminClient = createAdminClient()
    const { data: z } = await adminClient.from('zpravy').select('zavod_id').eq('id', zpravaId).single()
    if (!z) return { success: false, error: { code: ErrorCodes.NOT_FOUND, message: ErrorMessages[ErrorCodes.NOT_FOUND] } }
    const userId = await checkZavodAdminAccess((z as any).zavod_id)
    if (!userId) return { success: false, error: { code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] } }
    await (adminClient.from('zpravy') as any).update({ vyrizeno: true }).eq('id', zpravaId)
    return { success: true }
  } catch (e) { return { success: false, error: toErrorResponse(e) } }
}
