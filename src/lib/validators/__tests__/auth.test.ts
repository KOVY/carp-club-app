import { describe, it, expect } from 'vitest'
import { validateEmail, validatePassword, validateJmeno } from '../auth'

describe('validateEmail', () => {
  it('přijme platný email', () => { expect(validateEmail('a@b.cz').ok).toBe(true) })
  it('odmítne bez @', () => { expect(validateEmail('ab.cz').ok).toBe(false) })
  it('odmítne prázdný', () => { expect(validateEmail('').ok).toBe(false) })
})
describe('validatePassword', () => {
  it('přijme heslo >= 8 znaků', () => { expect(validatePassword('heslo123').ok).toBe(true) })
  it('odmítne krátké', () => { expect(validatePassword('abc').ok).toBe(false) })
})
describe('validateJmeno', () => {
  it('přijme jméno', () => { expect(validateJmeno('Jan Novák').ok).toBe(true) })
  it('odmítne prázdné/krátké', () => { expect(validateJmeno('J').ok).toBe(false) })
})
