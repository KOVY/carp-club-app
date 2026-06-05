import { describe, it, expect } from 'vitest'
import { canConfirmUlovek } from '../permissions'

const ctx = (role: string, peg?: number) => ({ role, pegCislo: peg } as any)

describe('canConfirmUlovek (libovolný tým)', () => {
  it('rozhodčí může vždy', () => { expect(canConfirmUlovek(ctx('rozhodci'), 5)).toBe(true) })
  it('pořadatel může vždy', () => { expect(canConfirmUlovek(ctx('poradatel'), 5)).toBe(true) })
  it('kapitán může potvrdit nesousední peg (libovolný tým)', () => { expect(canConfirmUlovek(ctx('kapitan', 1), 9)).toBe(true) })
  it('kapitán může potvrdit sousední peg', () => { expect(canConfirmUlovek(ctx('kapitan', 4), 5)).toBe(true) })
  it('závodník nemůže', () => { expect(canConfirmUlovek(ctx('zavodnik', 4), 5)).toBe(false) })
})
