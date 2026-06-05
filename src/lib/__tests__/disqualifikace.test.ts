import { describe, it, expect } from 'vitest'
import { applyDisqualifikace, jeDiskvalifikovan } from '../disqualifikace'

describe('jeDiskvalifikovan', () => {
  it('méně karet než práh → false', () => { expect(jeDiskvalifikovan(2, 3)).toBe(false) })
  it('karet >= práh → true', () => { expect(jeDiskvalifikovan(3, 3)).toBe(true) })
  it('práh 2 → true při 2 kartách', () => { expect(jeDiskvalifikovan(2, 2)).toBe(true) })
})
describe('applyDisqualifikace', () => {
  it('nediskvalifikovaný → skóre beze změny', () => { expect(applyDisqualifikace(42.5, 1, 3)).toBe(42.5) })
  it('diskvalifikovaný → skóre 0', () => { expect(applyDisqualifikace(42.5, 3, 3)).toBe(0) })
})
