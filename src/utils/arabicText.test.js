import { describe, it, expect } from 'vitest'
import {
  toDisplayArabic,
  isWaqfToken,
  toVerseTokens,
  toTajweedWords,
  toArabicDigits,
  normalizeArabicForSearch,
  parseTajweed
} from './arabicText.js'

describe('normalizeArabicForSearch', () => {
  it('matches a plain unvocalized query against a fully vocalized surah name', () => {
    const name = normalizeArabicForSearch('سُورَةُ ٱلْفَاتِحَةِ')
    expect(name.includes(normalizeArabicForSearch('الفاتحة'))).toBe(true)
    expect(name.includes(normalizeArabicForSearch('فاتحه'))).toBe(true)
  })

  it('strips the dagger alef so الرحمن matches ٱلرَّحْمَٰن', () => {
    const name = normalizeArabicForSearch('سُورَةُ ٱلرَّحْمَٰن')
    expect(name.includes(normalizeArabicForSearch('الرحمن'))).toBe(true)
  })

  it('normalizes alef, yeh, and teh marbuta variants', () => {
    expect(normalizeArabicForSearch('أإآٱ')).toBe('اااا')
    expect(normalizeArabicForSearch('هدى')).toBe(normalizeArabicForSearch('هدي'))
    expect(normalizeArabicForSearch('البقرة')).toBe(normalizeArabicForSearch('البقره'))
  })

  it('converts Arabic-Indic digits to ASCII so ١١٤ matches 114', () => {
    expect(normalizeArabicForSearch('١١٤')).toBe('114')
    expect(normalizeArabicForSearch('۲')).toBe('2')
  })

  it('strips tatweel and collapses whitespace', () => {
    expect(normalizeArabicForSearch('الرحـــيم')).toBe('الرحيم')
    expect(normalizeArabicForSearch('  سورة   يس  ')).toBe('سوره يس')
  })

  it('returns an empty string for empty input', () => {
    expect(normalizeArabicForSearch('')).toBe('')
    expect(normalizeArabicForSearch(undefined)).toBe('')
  })
})

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

describe('toTajweedWords', () => {
  it('groups tajweed segments into one word per space, keeping colored pieces', () => {
    const segments = [
      { text: 'وَأَ', rule: null },
      { text: 'نذِرْهُمْ يَوْمَ', rule: 'ikhafa' }
    ]
    const words = toTajweedWords(segments)
    expect(words.length).toBe(2)
    // First word keeps both pieces (rule change inside a word does not split the word).
    expect(words[0].pieces).toEqual([
      { text: 'وَأَ', rule: null },
      { text: 'نذِرْهُمْ', rule: 'ikhafa' }
    ])
    expect(words[1].pieces).toEqual([{ text: 'يَوْمَ', rule: 'ikhafa' }])
    expect(words.map(w => w.wordIndex)).toEqual([0, 1])
  })

  it('aligns word count with toVerseTokens so highlight indices match', () => {
    const text = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'
    const words = toTajweedWords([{ text, rule: null }])
    expect(words.length).toBe(toVerseTokens(text).length)
  })

  it('attaches a standalone waqf mark to the previous word', () => {
    const words = toTajweedWords([{ text: 'كلمة ۛ ثُمَّ', rule: null }])
    expect(words.length).toBe(2)
    expect(words[0].pieces.map(p => p.text).join('')).toBe('كلمة ۛ')
  })
})
