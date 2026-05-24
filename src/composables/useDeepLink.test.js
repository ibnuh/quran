import { describe, it, expect } from 'vitest'
import { parseLocation, buildVerseUrl } from './useDeepLink.js'

function route(params = {}, query = {}) {
  return { params, query }
}

describe('parseLocation', () => {
  it('reads surah and ayah from path params', () => {
    expect(parseLocation(route({ surah: '2', ayah: '255' }))).toEqual({ surah: 2, ayah: 255 })
  })

  it('reads surah only', () => {
    expect(parseLocation(route({ surah: '36' }))).toEqual({ surah: 36, ayah: null })
  })

  it('falls back to the ?surah= query param', () => {
    expect(parseLocation(route({}, { surah: '18' }))).toEqual({ surah: 18, ayah: null })
  })

  it('rejects out-of-range surahs', () => {
    expect(parseLocation(route({ surah: '200' }))).toEqual({ surah: null, ayah: null })
    expect(parseLocation(route({ surah: '0' }))).toEqual({ surah: null, ayah: null })
  })

  it('returns nulls for the bare root', () => {
    expect(parseLocation(route())).toEqual({ surah: null, ayah: null })
  })
})

describe('buildVerseUrl', () => {
  it('builds a surah-only path', () => {
    expect(buildVerseUrl(2)).toBe('/2')
  })

  it('builds a surah/ayah path', () => {
    expect(buildVerseUrl(2, 255)).toBe('/2/255')
  })
})
