import { describe, it, expect } from 'vitest'
import {
  toDisplayArabic,
  isWaqfToken,
  toVerseTokens,
  toArabicDigits,
  parseTajweed
} from './arabicText.js'

describe('parseTajweed', () => {
  it('splits tajweed HTML into ordered text/rule segments', () => {
    const raw = 'وَأَ<tajweed class=ikhafa>نذ</tajweed>ِرْهُمْ <span class=end>٣٩</span>'
    const segs = parseTajweed(raw)
    expect(segs).toEqual([
      { text: 'وَأَ', rule: null },
      { text: 'نذ', rule: 'ikhafa' },
      { text: 'ِرْهُمْ ', rule: null }
    ])
  })

  it('returns a single plain segment when there is no markup', () => {
    expect(parseTajweed('السلام')).toEqual([{ text: 'السلام', rule: null }])
  })

  it('returns an empty array for empty input', () => {
    expect(parseTajweed('')).toEqual([])
  })
})

describe('toArabicDigits', () => {
  it('converts western digits to Arabic-Indic numerals', () => {
    expect(toArabicDigits(1)).toBe('١')
    expect(toArabicDigits(45)).toBe('٤٥')
    expect(toArabicDigits(286)).toBe('٢٨٦')
  })
})

describe('toDisplayArabic', () => {
  it('renders final alef maqsura (U+0649) as farsi yeh (U+06CC) for display', () => {
    expect(toDisplayArabic('عَلَى')).toBe('عَلَی')
  })

  it('returns empty string for empty input', () => {
    expect(toDisplayArabic('')).toBe('')
    expect(toDisplayArabic(undefined)).toBe('')
  })
})

describe('isWaqfToken', () => {
  it('detects standalone waqf marks', () => {
    expect(isWaqfToken('ۛ')).toBe(true) // small high three dots
    expect(isWaqfToken('ۖ')).toBe(true)
    expect(isWaqfToken('كلمة')).toBe(false)
  })
})

describe('toVerseTokens', () => {
  it('produces one token per real word', () => {
    const tokens = toVerseTokens('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ')
    expect(tokens.length).toBe(4)
  })

  it('attaches a standalone waqf mark to the previous word (no dropped glyphs)', () => {
    const text = 'كلمة ۛ ثُمَّ'
    const tokens = toVerseTokens(text)
    expect(tokens.length).toBe(2)
    expect(tokens[0].display).toBe('كلمة ۛ')
    expect(tokens[1].display).toBe('ثُمَّ')
    // Joining tokens reproduces the full display string (nothing lost).
    expect(tokens.map(t => t.display).join(' ')).toBe(toDisplayArabic(text))
  })

  it('keeps the rendered glyph sequence identical to the plain display text', () => {
    const text = 'إِذَا وَقَعَتِ ۖ ٱلْوَاقِعَةُ'
    const joined = toVerseTokens(text)
      .map(t => t.display)
      .join(' ')
    expect(joined).toBe(toDisplayArabic(text))
  })
})
