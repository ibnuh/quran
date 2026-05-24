import { describe, it, expect } from 'vitest'
import { stripBismillahFromVerse } from './api.js'

describe('stripBismillahFromVerse', () => {
  it('strips the leading 4-word Bismillah', () => {
    const bismillah = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'
    const rest = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'
    expect(stripBismillahFromVerse(`${bismillah} ${rest}`)).toBe(rest)
  })

  it('leaves text without a leading baa untouched', () => {
    const text = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'
    expect(stripBismillahFromVerse(text)).toBe(text)
  })

  it('leaves short verses untouched', () => {
    const text = 'بِسْمِ اللَّهِ'
    expect(stripBismillahFromVerse(text)).toBe(text)
  })
})
