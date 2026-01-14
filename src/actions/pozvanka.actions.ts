'use server'
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Pozvánka Server Actions
 *
 * Akce pro správu pozvánek:
 * - Vytvoření pozvánky s automatickým vytvořením uživatele
 * - Generování magic linku pro přímé přihlášení
 * - Odeslání emailu s přímým přístupem
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ErrorCodes, ErrorMessages, toErrorResponse } from '@/lib/errors'
import { sendInvitationEmail } from '@/lib/email/resend'
import type {
  ActionResult,
  Pozvanka,
  CreatePozvankaInput,
  UserRole,
} from '@/lib/types'

// Base URL for invitation links
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
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
    const { data: tymData } = await supabase
      .from('tymy')
      .select('zavod_id')
      .eq('id', tymId)
      .single()

    const tym = tymData as { zavod_id: string } | null

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
 * Vytvořit pozvánku s automatickým vytvořením uživatele a magic linkem
 *
 * Tento proces:
 * 1. Vytvoří uživatelský účet (pokud neexistuje)
 * 2. Vytvoří profil s jménem
 * 3. Zaregistruje uživatele do závodu
 * 4. Vygeneruje magic link pro přímé přihlášení
 * 5. Odešle email s přímým odkazem do závodu
 */
export async function createPozvanka(input: CreatePozvankaInput): Promise<ActionResult<Pozvanka>> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const adminUserId = await checkZavodAdminAccess(input.zavodId)
    if (!adminUserId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění vytvářet pozvánky',
        },
      }
    }

    // Validace
    const email = input.email?.toLowerCase().trim()
    if (!email || !email.includes('@')) {
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

    const jmeno = input.jmeno.trim()
    const role = (input.role || 'zavodnik') as UserRole

    // Získat informace o závodu
    const { data: zavodData } = await supabase
      .from('zavody')
      .select('nazev, misto, datum_start, datum_end')
      .eq('id', input.zavodId)
      .single()

    const zavod = zavodData as { nazev: string; misto: string | null; datum_start: string; datum_end: string } | null
    if (!zavod) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Závod nenalezen',
        },
      }
    }

    const platnostDo = input.platnostDo || zavod.datum_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Získat informace o týmu (pokud existuje)
    let tymNazev: string | null = null
    if (input.tymId) {
      const { data: tymData } = await supabase
        .from('tymy')
        .select('nazev')
        .eq('id', input.tymId)
        .single()
      tymNazev = (tymData as { nazev: string } | null)?.nazev || null
    }

    // 1. Vytvořit nebo najít uživatele
    let targetUserId: string

    // Zkontrolovat jestli uživatel existuje
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email)

    if (existingUser) {
      targetUserId = existingUser.id
      console.log('User already exists:', targetUserId)
    } else {
      // Vytvořit nového uživatele pomocí Admin API
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true, // Automaticky potvrdit email
        user_metadata: {
          jmeno,
          telefon: input.telefon?.trim() || null,
        },
      })

      if (createError || !newUser.user) {
        console.error('Failed to create user:', createError)
        return {
          success: false,
          error: {
            code: 'USER_CREATION_FAILED',
            message: 'Nepodařilo se vytvořit uživatelský účet',
            details: { originalError: createError?.message },
          },
        }
      }

      targetUserId = newUser.user.id
      console.log('Created new user:', targetUserId)
    }

    // 2. Vytvořit nebo aktualizovat profil
    await (adminClient
      .from('profiles') as any)
      .upsert({
        id: targetUserId,
        email,
        jmeno,
        telefon: input.telefon?.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    // 3. Zaregistrovat uživatele do závodu
    await (adminClient
      .from('zavod_role') as any)
      .upsert({
        zavod_id: input.zavodId,
        user_id: targetUserId,
        role,
      }, { onConflict: 'zavod_id,user_id' })

    // 4. Přidat do týmu (pokud je specifikován)
    if (input.tymId) {
      await (adminClient
        .from('clenove_tymu') as any)
        .upsert({
          tym_id: input.tymId,
          user_id: targetUserId,
          role,
        }, { onConflict: 'tym_id,user_id' })

      // Nastavit kapitána pokud je role kapitán
      if (role === 'kapitan') {
        await (adminClient
          .from('tymy') as any)
          .update({ kapitan_id: targetUserId, updated_at: new Date().toISOString() })
          .eq('id', input.tymId)
      }
    }

    // 5. Vytvořit pozvánku v databázi (pro tracking)
    const { data: pozvankaData, error: pozvankaError } = await supabase
      .from('pozvanky')
      .insert({
        zavod_id: input.zavodId,
        tym_id: input.tymId || null,
        email,
        jmeno,
        telefon: input.telefon?.trim() || null,
        role,
        platnost_do: platnostDo,
        pouzita: true, // Označit jako použitou (uživatel je už zaregistrován)
        registrovano_at: new Date().toISOString(),
      } as any)
      .select('*')
      .single()

    if (pozvankaError) {
      // Kontrola duplicity - pokud pozvánka existuje, pokračuj (jen znovu pošleme email)
      if (pozvankaError.code !== '23505') {
        console.error('Failed to create invitation record:', pozvankaError)
      }
    }

    // 6. Vygenerovat magic link pro přímé přihlášení
    const redirectUrl = `${getBaseUrl()}/zavod/${input.zavodId}`

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (linkError || !linkData) {
      console.error('Failed to generate magic link:', linkError)
      return {
        success: false,
        error: {
          code: 'LINK_GENERATION_FAILED',
          message: 'Nepodařilo se vygenerovat přihlašovací odkaz',
        },
      }
    }

    // Magic link je v linkData.properties.action_link
    const magicLink = linkData.properties?.action_link

    if (!magicLink) {
      console.error('No magic link in response:', linkData)
      return {
        success: false,
        error: {
          code: 'LINK_GENERATION_FAILED',
          message: 'Nepodařilo se vygenerovat přihlašovací odkaz',
        },
      }
    }

    // 7. Odeslat email s magic linkem
    const emailResult = await sendInvitationEmail({
      to: email,
      jmeno,
      zavodNazev: zavod.nazev,
      zavodMisto: zavod.misto,
      zavodDatumStart: zavod.datum_start,
      zavodDatumEnd: zavod.datum_end,
      tymNazev,
      role,
      inviteLink: magicLink, // Použít magic link místo pozvánkového linku
    })

    if (!emailResult.success) {
      console.warn('Failed to send invitation email:', emailResult.error)
    }

    const pozvanka = (pozvankaData as unknown) as Pozvanka | null

    return { success: true, data: pozvanka || { id: 'temp', email, jmeno, role } as Pozvanka }
  } catch (error) {
    console.error('createPozvanka error:', error)
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Znovu odeslat pozvánku (vygenerovat nový magic link a odeslat email)
 */
export async function resendPozvanka(pozvankaId: string): Promise<ActionResult<Pozvanka>> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Získat pozvánku s informacemi o závodu a týmu
    const { data: existingPozvankaData } = await supabase
      .from('pozvanky')
      .select('*, zavod:zavody(nazev, misto, datum_start, datum_end), tym:tymy(nazev)')
      .eq('id', pozvankaId)
      .single()

    const existingPozvanka = existingPozvankaData as {
      id: string
      zavod_id: string
      pouzita: boolean
      jmeno: string
      email: string
      role: string
      zavod: { nazev: string; misto: string | null; datum_start: string; datum_end: string } | null
      tym: { nazev: string } | null
    } | null

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

    const zavod = existingPozvanka.zavod
    if (!zavod) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Závod nenalezen',
        },
      }
    }

    // Vygenerovat nový magic link
    const redirectUrl = `${getBaseUrl()}/zavod/${existingPozvanka.zavod_id}`

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: existingPozvanka.email,
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Failed to generate magic link:', linkError)
      return {
        success: false,
        error: {
          code: 'LINK_GENERATION_FAILED',
          message: 'Nepodařilo se vygenerovat přihlašovací odkaz',
        },
      }
    }

    const magicLink = linkData.properties.action_link

    // Odeslat email s novým magic linkem
    const emailResult = await sendInvitationEmail({
      to: existingPozvanka.email,
      jmeno: existingPozvanka.jmeno,
      zavodNazev: zavod.nazev,
      zavodMisto: zavod.misto,
      zavodDatumStart: zavod.datum_start,
      zavodDatumEnd: zavod.datum_end,
      tymNazev: existingPozvanka.tym?.nazev || null,
      role: existingPozvanka.role,
      inviteLink: magicLink,
    })

    if (!emailResult.success) {
      console.warn('Failed to resend invitation email:', emailResult.error)
    }

    // Vrátit existující pozvánku
    const { data: updatedPozvanka } = await supabase
      .from('pozvanky')
      .select('*')
      .eq('id', pozvankaId)
      .single()

    return { success: true, data: (updatedPozvanka as unknown) as Pozvanka }
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
    const { data: existingPozvankaData2 } = await supabase
      .from('pozvanky')
      .select('zavod_id, pouzita')
      .eq('id', pozvankaId)
      .single()

    const existingPozvanka2 = existingPozvankaData2 as {
      zavod_id: string
      pouzita: boolean
    } | null

    if (!existingPozvanka2) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Pozvánka nenalezena',
        },
      }
    }

    const userId = await checkZavodAdminAccess(existingPozvanka2.zavod_id)
    if (!userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Nemáte oprávnění mazat pozvánky',
        },
      }
    }

    if (existingPozvanka2.pouzita) {
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
  zavod: { id: string; nazev: string; misto: string | null; datum_start: string; datum_end: string }
  tym: { id: string; nazev: string; barva: string } | null
}>> {
  try {
    const supabase = await createClient()

    const { data: pozvankaData, error } = await supabase
      .from('pozvanky')
      .select(`
        *,
        zavod:zavody(id, nazev, misto, datum_start, datum_end),
        tym:tymy(id, nazev, barva)
      `)
      .eq('token', token)
      .single()

    const pozvanka = pozvankaData as {
      id: string
      zavod_id: string
      tym_id: string | null
      email: string
      jmeno: string
      telefon: string | null
      role: UserRole
      token: string
      platnost_do: string
      pouzita: boolean
      registrovano_at: string | null
      created_at: string
      zavod: { id: string; nazev: string; misto: string | null; datum_start: string; datum_end: string } | null
      tym: { id: string; nazev: string; barva: string | null } | null
    } | null

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
        zavod: pozvanka.zavod as { id: string; nazev: string; misto: string | null; datum_start: string; datum_end: string },
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
    const { data, error } = await (supabase
      .rpc as any)('register_via_invitation', { p_token: token })

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

    const { data, error } = await (supabase
      .rpc as any)('complete_invitation_registration', {
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
    const { data: zavodBatchData } = await supabase
      .from('zavody')
      .select('datum_end')
      .eq('id', zavodId)
      .single()

    const zavodBatch = zavodBatchData as { datum_end: string } | null
    const platnostDo = zavodBatch?.datum_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

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
        } as any)

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
