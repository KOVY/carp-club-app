/**
 * Konfigurace sezóny - propojení lig A a B
 *
 * Toto nastavení určuje, které závody patří do které ligy
 * a pravidla pro postup/sestup.
 */

export interface LigaConfig {
  id: string
  nazev: string
  zavodId: string
  barva: string
  icon: string
}

export interface SezonaConfig {
  rok: number
  nazev: string
  ligaA: LigaConfig
  ligaB: LigaConfig
  /** Počet týmů, které sestupují z A do B */
  pocetSestupujicich: number
  /** Počet týmů, které postupují z B do A */
  pocetPostupujicich: number
}

// Konfigurace sezóny 2026
export const SEZONA_2026: SezonaConfig = {
  rok: 2026,
  nazev: "Kaprařská Liga 2026",
  ligaA: {
    id: "liga-a",
    nazev: "Liga A",
    zavodId: "65f38c5c-7f4b-4ff3-a2db-4fdf8b91261e", // Liga A 2026 - 0. kolo
    barva: "#2563eb", // Modrá
    icon: "🏆",
  },
  ligaB: {
    id: "liga-b",
    nazev: "Liga B",
    zavodId: "f6a4423c-a49b-4b60-bab3-cf253ce6bd27", // Liga B 2026
    barva: "#16a34a", // Zelená
    icon: "🎯",
  },
  pocetSestupujicich: 3, // Poslední 3 z A jdou do B
  pocetPostupujicich: 1, // První 1 z B jde do A
}

// Aktuální aktivní sezóna
export const AKTUALNI_SEZONA = SEZONA_2026

// Mapa všech sezón (pro budoucí archiv)
export const SEZONY: Record<number, SezonaConfig> = {
  2026: SEZONA_2026,
}

/**
 * Získá konfiguraci sezóny podle roku
 */
export function getSezonaConfig(rok: number): SezonaConfig | null {
  return SEZONY[rok] || null
}

/**
 * Určí, zda je tým v sestupové zóně (Liga A)
 */
export function isVSestupoveZone(
  pozice: number,
  celkemTymu: number,
  pocetSestupujicich: number
): boolean {
  return pozice > celkemTymu - pocetSestupujicich
}

/**
 * Určí, zda je tým v postupové zóně (Liga B)
 */
export function isVPostupoveZone(
  pozice: number,
  pocetPostupujicich: number
): boolean {
  return pozice <= pocetPostupujicich
}
