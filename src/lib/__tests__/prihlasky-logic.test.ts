import { describe, it, expect } from 'vitest'
import { resolvePrihlaskaStav } from '../prihlasky-logic'

describe('resolvePrihlaskaStav', () => {
  it('volná kapacita → prihlasen', () => {
    expect(resolvePrihlaskaStav(5, 20, 0)).toEqual({ stav: 'prihlasen', poradi: null })
  })
  it('pocet_pegu null (neomezeno) → prihlasen', () => {
    expect(resolvePrihlaskaStav(99, null, 0)).toEqual({ stav: 'prihlasen', poradi: null })
  })
  it('plná kapacita → nahradnik, pořadí max+1', () => {
    expect(resolvePrihlaskaStav(20, 20, 2)).toEqual({ stav: 'nahradnik', poradi: 3 })
  })
  it('první náhradník dostane pořadí 1', () => {
    expect(resolvePrihlaskaStav(20, 20, 0)).toEqual({ stav: 'nahradnik', poradi: 1 })
  })
})
