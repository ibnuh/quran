import { describe, it, expect } from 'vitest'
import { getJuzForVerse } from './juzs.js'

describe('getJuzForVerse', () => {
  it('maps the first verse to juz 1', () => {
    expect(getJuzForVerse(1, 1)).toBe(1)
  })

  it('maps Al-Baqarah 142 to juz 2', () => {
    expect(getJuzForVerse(2, 142)).toBe(2)
  })

  it('maps Al-Baqarah 141 (still juz 1)', () => {
    expect(getJuzForVerse(2, 141)).toBe(1)
  })

  it('maps An-Naba 1 to juz 30', () => {
    expect(getJuzForVerse(78, 1)).toBe(30)
  })

  it('maps Ya-Sin 28 to juz 23', () => {
    expect(getJuzForVerse(36, 28)).toBe(23)
  })
})
