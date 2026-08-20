import { describe, it, expect } from 'vitest'
import { parseAyahReference } from './ayahReference.js'

describe('parseAyahReference', () => {
  it('parses a colon-separated surah:ayah reference', () => {
    expect(parseAyahReference('2:255')).toEqual({ surah: 2, ayah: 255 })
    expect(parseAyahReference('1:7')).toEqual({ surah: 1, ayah: 7 })
  })

  it('parses a whitespace-separated surah ayah reference', () => {
    expect(parseAyahReference('2 255')).toEqual({ surah: 2, ayah: 255 })
    expect(parseAyahReference('  18   10  ')).toEqual({ surah: 18, ayah: 10 })
  })

  it('parses Arabic-Indic digits', () => {
    expect(parseAyahReference('٢:٢٥٥')).toEqual({ surah: 2, ayah: 255 })
    expect(parseAyahReference('٢ ٢٥٥')).toEqual({ surah: 2, ayah: 255 })
  })

  it('parses extended (Persian/Urdu) digits', () => {
    expect(parseAyahReference('۲:۵')).toEqual({ surah: 2, ayah: 5 })
  })

  it('allows spaces around the colon', () => {
    expect(parseAyahReference('2 : 255')).toEqual({ surah: 2, ayah: 255 })
    expect(parseAyahReference('2: 255')).toEqual({ surah: 2, ayah: 255 })
  })

  it('accepts the last ayah of a surah', () => {
    expect(parseAyahReference('2:286')).toEqual({ surah: 2, ayah: 286 })
    expect(parseAyahReference('114:6')).toEqual({ surah: 114, ayah: 6 })
  })

  it('rejects out-of-range surah numbers', () => {
    expect(parseAyahReference('0:1')).toBeNull()
    expect(parseAyahReference('115:1')).toBeNull()
  })

  it('rejects ayah numbers beyond the surah length', () => {
    expect(parseAyahReference('1:8')).toBeNull()
    expect(parseAyahReference('2:287')).toBeNull()
    expect(parseAyahReference('2:0')).toBeNull()
  })

  it('rejects plain numbers and non-reference text', () => {
    expect(parseAyahReference('2')).toBeNull()
    expect(parseAyahReference('baqara')).toBeNull()
    expect(parseAyahReference('2:')).toBeNull()
    expect(parseAyahReference(':5')).toBeNull()
    expect(parseAyahReference('1:2:3')).toBeNull()
    expect(parseAyahReference('')).toBeNull()
    expect(parseAyahReference(undefined)).toBeNull()
  })
})
