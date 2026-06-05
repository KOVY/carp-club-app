import { describe, it, expect } from 'vitest'
import { validateFotoFile, MAX_FOTO_BYTES, ALLOWED_FOTO_MIME } from '../foto'

function fakeFile(type: string, size: number, name = 'x'): File {
  return { type, size, name } as unknown as File
}

describe('validateFotoFile', () => {
  it('přijme validní jpeg', () => {
    expect(validateFotoFile(fakeFile('image/jpeg', 1000))).toEqual({ ok: true })
  })
  it('odmítne chybějící soubor', () => {
    expect(validateFotoFile(null).ok).toBe(false)
  })
  it('odmítne prázdný soubor', () => {
    expect(validateFotoFile(fakeFile('image/jpeg', 0)).ok).toBe(false)
  })
  it('odmítne nepovolený MIME (svg)', () => {
    const r = validateFotoFile(fakeFile('image/svg+xml', 1000))
    expect(r.ok).toBe(false)
  })
  it('odmítne přerostlý soubor', () => {
    expect(validateFotoFile(fakeFile('image/png', MAX_FOTO_BYTES + 1)).ok).toBe(false)
  })
  it('má povolené tři MIME typy', () => {
    expect(ALLOWED_FOTO_MIME).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})
