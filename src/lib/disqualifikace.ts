/** Tým je diskvalifikovaný, když má počet žlutých karet >= práh závodu. */
export function jeDiskvalifikovan(pocetKaret: number, prah: number): boolean {
  return pocetKaret >= prah
}

/** Diskvalifikovaný tým má skóre 0. */
export function applyDisqualifikace(skore: number, pocetKaret: number, prah: number): number {
  return jeDiskvalifikovan(pocetKaret, prah) ? 0 : skore
}
