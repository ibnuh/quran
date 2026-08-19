import { describe, it, expect } from 'vitest'
import {
  parseTranslationText,
  resolveTranslationSource,
  translationHasFootnotes,
  CLOUD_TO_QURANCOM
} from './translationText.js'

describe('parseTranslationText', () => {
  it('returns plain text unchanged when there is no HTML', () => {
    const result = parseTranslationText('In the name of Allah')
    expect(result.text).toBe('In the name of Allah')
    expect(result.segments).toEqual([{ type: 'text', value: 'In the name of Allah' }])
    expect(result.footnotes).toEqual([])
  })

  it('parses unquoted foot_note attributes', () => {
    const html = 'Alif, Lam, Meem.<sup foot_note=195935>1</sup>'
    const result = parseTranslationText(html)
    expect(result.text).toBe('Alif, Lam, Meem.')
    expect(result.segments).toEqual([
      { type: 'text', value: 'Alif, Lam, Meem.' },
      { type: 'footnote', id: 195935, label: '1' }
    ])
    expect(result.footnotes).toEqual([{ id: 195935, label: '1' }])
  })

  it('parses quoted foot_note attributes', () => {
    const html = 'Alif, Lam, Mim.<sup foot_note="177007">1</sup>'
    const result = parseTranslationText(html)
    expect(result.footnotes).toEqual([{ id: 177007, label: '1' }])
    expect(result.segments[1]).toEqual({ type: 'footnote', id: 177007, label: '1' })
  })

  it('handles multiple footnotes in one verse', () => {
    const html =
      'Who believe in the unseen, establish prayer,<sup foot_note=195938>1</sup> and spend out of what We<sup foot_note=195937>2</sup> have provided for them,'
    const result = parseTranslationText(html)
    expect(result.footnotes).toEqual([
      { id: 195938, label: '1' },
      { id: 195937, label: '2' }
    ])
    expect(result.text).toBe(
      'Who believe in the unseen, establish prayer, and spend out of what We have provided for them,'
    )
    expect(result.segments.filter(s => s.type === 'footnote')).toHaveLength(2)
  })

  it('strips non-footnote tags while keeping text', () => {
    const html = 'a guidance for the mindful<i class="s">(of God) </i>people'
    const result = parseTranslationText(html)
    expect(result.text).toBe('a guidance for the mindful(of God) people')
    expect(result.footnotes).toEqual([])
  })

  it('decodes common HTML entities', () => {
    const result = parseTranslationText('Allah &amp; His messengers')
    expect(result.text).toBe('Allah & His messengers')
  })

  it('decodes numeric entities above the BMP without corrupting them', () => {
    // U+1EE00 ARABIC MATHEMATICAL ALEF; fromCharCode would truncate this to a
    // lone surrogate. Force the tag path so decodeEntities runs on stripped text.
    const result = parseTranslationText('<i>mark &#126464; here</i>')
    expect(result.text).toBe('mark \u{1EE00} here')
  })

  it('decodes hex entities above the BMP', () => {
    const result = parseTranslationText('<i>mark &#x1EE00; here</i>')
    expect(result.text).toBe('mark \u{1EE00} here')
  })

  it('keeps invalid numeric entities as literal text', () => {
    // 0x110000 is above the Unicode range; fromCodePoint would throw on it.
    const result = parseTranslationText('<i>bad &#1114112; entity</i>')
    expect(result.text).toBe('bad &#1114112; entity')
  })

  it('handles empty input', () => {
    expect(parseTranslationText('')).toEqual({ text: '', segments: [], footnotes: [] })
    expect(parseTranslationText(null)).toEqual({ text: '', segments: [], footnotes: [] })
  })
})

describe('resolveTranslationSource', () => {
  it('routes qdc.* identifiers to quran.com', () => {
    expect(resolveTranslationSource('qdc.84')).toEqual({ kind: 'qurancom', editionId: 84 })
  })

  it('routes mapped cloud editions to quran.com', () => {
    expect(resolveTranslationSource('en.sahih')).toEqual({
      kind: 'qurancom',
      editionId: CLOUD_TO_QURANCOM['en.sahih']
    })
    expect(resolveTranslationSource('en.hilali')).toEqual({
      kind: 'qurancom',
      editionId: CLOUD_TO_QURANCOM['en.hilali']
    })
  })

  it('keeps unmapped cloud editions on the cloud API', () => {
    expect(resolveTranslationSource('en.itani')).toEqual({ kind: 'cloud', editionId: 'en.itani' })
    expect(resolveTranslationSource('en.pickthall')).toEqual({
      kind: 'cloud',
      editionId: 'en.pickthall'
    })
  })

  it('routes additional mapped cloud editions to quran.com', () => {
    expect(resolveTranslationSource('fr.hamidullah')).toEqual({
      kind: 'qurancom',
      editionId: 31
    })
    expect(resolveTranslationSource('ur.jalandhry')).toEqual({
      kind: 'qurancom',
      editionId: 54
    })
  })
})

describe('translationHasFootnotes', () => {
  it('is true for Saheeh and known qdc note editions', () => {
    expect(translationHasFootnotes('en.sahih')).toBe(true)
    expect(translationHasFootnotes('qdc.54')).toBe(true)
    expect(translationHasFootnotes('qdc.20')).toBe(true)
  })

  it('is false for plain cloud editions without a note-capable twin', () => {
    expect(translationHasFootnotes('en.itani')).toBe(false)
    expect(translationHasFootnotes('en.pickthall')).toBe(false)
    expect(translationHasFootnotes('qdc.84')).toBe(false)
  })
})
