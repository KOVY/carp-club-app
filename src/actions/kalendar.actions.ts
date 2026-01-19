'use server'

/**
 * Kalendář Server Actions
 *
 * Akce pro získání závodů pro kalendář
 */

import { createClient } from '@/lib/supabase/server'
import { toErrorResponse } from '@/lib/errors'
import type { ActionResult } from '@/lib/types'

export interface KalendarZavod {
  id: string
  nazev: string
  misto: string | null
  datum_start: string
  datum_end: string
  stav: string
  pocet_tymu: number
}

export interface KalendarMonth {
  year: number
  month: number
  zavody: KalendarZavod[]
}

/**
 * Získat závody pro kalendář (aktuální a budoucí)
 */
export async function getZavodyForKalendar(): Promise<ActionResult<KalendarZavod[]>> {
  try {
    const supabase = await createClient()

    // Získat závody od začátku minulého měsíce
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)
    startDate.setDate(1)

    const { data: zavody, error } = await supabase
      .from('zavody')
      .select(`
        id,
        nazev,
        misto,
        datum_start,
        datum_end,
        stav,
        tymy:tymy(count)
      `)
      .gte('datum_start', startDate.toISOString())
      .order('datum_start', { ascending: true })

    if (error) {
      return {
        success: false,
        error: toErrorResponse(error),
      }
    }

    const formattedZavody: KalendarZavod[] = (zavody || []).map((z: {
      id: string
      nazev: string
      misto: string | null
      datum_start: string
      datum_end: string
      stav: string
      tymy: { count: number }[]
    }) => ({
      id: z.id,
      nazev: z.nazev,
      misto: z.misto,
      datum_start: z.datum_start,
      datum_end: z.datum_end,
      stav: z.stav,
      pocet_tymu: z.tymy?.[0]?.count || 0,
    }))

    return {
      success: true,
      data: formattedZavody,
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}

/**
 * Získat závody pro konkrétní měsíc
 */
export async function getZavodyForMonth(
  year: number,
  month: number
): Promise<ActionResult<KalendarZavod[]>> {
  try {
    const supabase = await createClient()

    // Začátek a konec měsíce
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const { data: zavody, error } = await supabase
      .from('zavody')
      .select(`
        id,
        nazev,
        misto,
        datum_start,
        datum_end,
        stav,
        tymy:tymy(count)
      `)
      .or(`datum_start.gte.${startDate.toISOString()},datum_end.gte.${startDate.toISOString()}`)
      .lte('datum_start', endDate.toISOString())
      .order('datum_start', { ascending: true })

    if (error) {
      return {
        success: false,
        error: toErrorResponse(error),
      }
    }

    const formattedZavody: KalendarZavod[] = (zavody || []).map((z: {
      id: string
      nazev: string
      misto: string | null
      datum_start: string
      datum_end: string
      stav: string
      tymy: { count: number }[]
    }) => ({
      id: z.id,
      nazev: z.nazev,
      misto: z.misto,
      datum_start: z.datum_start,
      datum_end: z.datum_end,
      stav: z.stav,
      pocet_tymu: z.tymy?.[0]?.count || 0,
    }))

    return {
      success: true,
      data: formattedZavody,
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorResponse(error),
    }
  }
}
