"use server"

import { createClient } from "@/lib/supabase/server"
import { getLeaderboard } from "./leaderboard.actions"
import { AKTUALNI_SEZONA, getSezonaConfig, type SezonaConfig } from "@/lib/sezona-config"
import type { LeaderboardEntry, ActionResult } from "@/lib/types"

export interface LigaLeaderboard {
  liga: "A" | "B"
  nazev: string
  barva: string
  zavodId: string
  leaderboard: LeaderboardEntry[]
  embargoActive: boolean
  celkemTymu: number
}

export interface SezonaData {
  sezona: SezonaConfig
  ligaA: LigaLeaderboard
  ligaB: LigaLeaderboard
}

/**
 * Načte průběžné pořadí obou lig v sezóně
 */
export async function getSezonaLeaderboard(
  rok: number = AKTUALNI_SEZONA.rok
): Promise<ActionResult<SezonaData>> {
  const sezona = getSezonaConfig(rok)

  if (!sezona) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Sezóna ${rok} nebyla nalezena`,
      },
    }
  }

  try {
    // Načíst obě ligy paralelně
    const [ligaAResult, ligaBResult] = await Promise.all([
      getLeaderboard(sezona.ligaA.zavodId),
      getLeaderboard(sezona.ligaB.zavodId),
    ])

    if (!ligaAResult.success || !ligaAResult.data) {
      return {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Nepodařilo se načíst data Ligy A",
        },
      }
    }

    if (!ligaBResult.success || !ligaBResult.data) {
      return {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Nepodařilo se načíst data Ligy B",
        },
      }
    }

    return {
      success: true,
      data: {
        sezona,
        ligaA: {
          liga: "A",
          nazev: sezona.ligaA.nazev,
          barva: sezona.ligaA.barva,
          zavodId: sezona.ligaA.zavodId,
          leaderboard: ligaAResult.data.leaderboard,
          embargoActive: ligaAResult.data.embargoActive,
          celkemTymu: ligaAResult.data.leaderboard.length,
        },
        ligaB: {
          liga: "B",
          nazev: sezona.ligaB.nazev,
          barva: sezona.ligaB.barva,
          zavodId: sezona.ligaB.zavodId,
          leaderboard: ligaBResult.data.leaderboard,
          embargoActive: ligaBResult.data.embargoActive,
          celkemTymu: ligaBResult.data.leaderboard.length,
        },
      },
    }
  } catch (error) {
    console.error("Error fetching sezona leaderboard:", error)
    return {
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Nepodařilo se načíst data sezóny",
      },
    }
  }
}

/**
 * Načte základní info o sezóně (pro metadata/OG)
 */
export async function getSezonaInfo(rok: number = AKTUALNI_SEZONA.rok): Promise<ActionResult<{
  sezona: SezonaConfig
  ligaANazev: string
  ligaBNazev: string
}>> {
  const sezona = getSezonaConfig(rok)

  if (!sezona) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Sezóna ${rok} nebyla nalezena`,
      },
    }
  }

  const supabase = await createClient()

  // Načíst názvy závodů
  const [zavodA, zavodB] = await Promise.all([
    supabase.from("zavody").select("nazev").eq("id", sezona.ligaA.zavodId).single(),
    supabase.from("zavody").select("nazev").eq("id", sezona.ligaB.zavodId).single(),
  ])

  return {
    success: true,
    data: {
      sezona,
      ligaANazev: (zavodA.data as { nazev: string } | null)?.nazev || sezona.ligaA.nazev,
      ligaBNazev: (zavodB.data as { nazev: string } | null)?.nazev || sezona.ligaB.nazev,
    },
  }
}
