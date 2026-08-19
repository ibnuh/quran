import { describe, it, expect } from 'vitest'
import { normalizeLatinForSearch, matchesLatinSearch } from './latinText.js'
import SURAHS from '../data/surahs.js'

describe('normalizeLatinForSearch', () => {
  it('collapses doubled vowels so waq matches Waaqia', () => {
    const name = normalizeLatinForSearch('Al-Waaqia')
    expect(name.includes(normalizeLatinForSearch('waq'))).toBe(true)
    expect(name.includes(normalizeLatinForSearch('waaqiah'))).toBe(true)
    expect(name.includes(normalizeLatinForSearch('waqiah'))).toBe(true)
  })

  it('folds oo to u so rum matches Room', () => {
    const name = normalizeLatinForSearch('Ar-Room')
    expect(name.includes(normalizeLatinForSearch('rum'))).toBe(true)
    expect(name.includes(normalizeLatinForSearch('room'))).toBe(true)
  })

  it('folds ee to i so yasin matches Yaseen', () => {
    expect(normalizeLatinForSearch('Yaseen')).toBe(normalizeLatinForSearch('yasin'))
  })

  it('folds aa and trailing ah so fatihah matches Al-Faatiha', () => {
    const name = normalizeLatinForSearch('Al-Faatiha')
    expect(name.includes(normalizeLatinForSearch('fatihah'))).toBe(true)
    expect(name.includes(normalizeLatinForSearch('fatiha'))).toBe(true)
  })

  it('folds oo so nur matches An-Noor', () => {
    const name = normalizeLatinForSearch('An-Noor')
    expect(name.includes(normalizeLatinForSearch('nur'))).toBe(true)
  })

  it('maps Indonesian sy to sh so asy-syams matches Ash-Shams', () => {
    expect(normalizeLatinForSearch('Asy-Syams')).toBe(normalizeLatinForSearch('Ash-Shams'))
  })

  it('maps Indonesian dz/ts and au so kautsar matches Al-Kawthar', () => {
    const name = normalizeLatinForSearch('Al-Kawthar')
    expect(name.includes(normalizeLatinForSearch('kautsar'))).toBe(true)
  })

  it('strips apostrophes and hyphens', () => {
    expect(normalizeLatinForSearch("Al-An'aam")).toBe(normalizeLatinForSearch('alanaam'))
    expect(normalizeLatinForSearch("Al-An'aam")).toBe(normalizeLatinForSearch('alanam'))
  })

  it('returns an empty string for empty input', () => {
    expect(normalizeLatinForSearch('')).toBe('')
    expect(normalizeLatinForSearch(undefined)).toBe('')
  })
})

describe('matchesLatinSearch', () => {
  it('finds Al-Waaqia from the short Indonesian stem waq', () => {
    expect(matchesLatinSearch('Al-Waaqia', 'waq')).toBe(true)
    expect(matchesLatinSearch('56. Al-Waaqia - The Inevitable', 'waq')).toBe(true)
  })

  it('finds Ar-Room from rum', () => {
    expect(matchesLatinSearch('Ar-Room', 'rum')).toBe(true)
    expect(matchesLatinSearch('30. Ar-Room - The Romans', 'rum')).toBe(true)
  })

  it('requires every whitespace term to match', () => {
    expect(matchesLatinSearch('56. Al-Waaqia - The Inevitable', '56 waq')).toBe(true)
    expect(matchesLatinSearch('56. Al-Waaqia - The Inevitable', 'waq cow')).toBe(false)
  })

  it('returns false for empty query', () => {
    expect(matchesLatinSearch('Ar-Room', '')).toBe(false)
    expect(matchesLatinSearch('Ar-Room', '   ')).toBe(false)
  })

  it('finds catalog surahs from Indonesian stems', () => {
    const hits = q => SURAHS.filter(s => matchesLatinSearch(s.englishName, q)).map(s => s.number)
    expect(hits('waq')).toContain(56)
    expect(hits('waaqiah')).toContain(56)
    expect(hits('rum')).toContain(30)
    expect(hits('yasin')).toContain(36)
    expect(hits('fatihah')).toContain(1)
  })
})
