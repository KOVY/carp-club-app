export type PrihlaskaStav = 'prihlasen' | 'nahradnik' | 'schvaleno' | 'zruseno'

/** Rozhodne stav nové přihlášky podle obsazenosti a kapacity. */
export function resolvePrihlaskaStav(
  obsazenost: number,
  pocetPegu: number | null,
  maxPoradiNahradnika: number,
): { stav: 'prihlasen' | 'nahradnik'; poradi: number | null } {
  if (pocetPegu === null || obsazenost < pocetPegu) {
    return { stav: 'prihlasen', poradi: null }
  }
  return { stav: 'nahradnik', poradi: maxPoradiNahradnika + 1 }
}
