import { describe, it, expect } from 'vitest'
import {
  getResponsiveDefaults,
  getPreloadCount,
  isAllowedAudioUrl,
  filterAllowedAudioUrls
} from './config.js'

describe('getResponsiveDefaults', () => {
  it('returns phone defaults below 480px', () => {
    expect(getResponsiveDefaults(375)).toEqual({
      arabicFontSize: 1.8,
      translationFontSize: 0.95,
      contentWidth: 100
    })
  })

  it('returns tablet defaults between 768 and 1024', () => {
    expect(getResponsiveDefaults(900).arabicFontSize).toBe(2.5)
  })

  it('returns desktop defaults at large widths', () => {
    expect(getResponsiveDefaults(1440).arabicFontSize).toBe(3.2)
  })
})

describe('getPreloadCount', () => {
  it('defaults to 3 with no connection info', () => {
    expect(getPreloadCount(null)).toBe(3)
  })

  it('preloads more on 4g', () => {
    expect(getPreloadCount({ effectiveType: '4g' })).toBe(5)
  })

  it('preloads conservatively on slow connections', () => {
    expect(getPreloadCount({ effectiveType: '2g' })).toBe(1)
  })
})

describe('isAllowedAudioUrl', () => {
  it('accepts known HTTPS audio hosts', () => {
    expect(isAllowedAudioUrl('https://download.quranicaudio.com/quran/a.mp3')).toBe(true)
    expect(isAllowedAudioUrl('https://verses.quran.com/AbdulBaset/Mujawwad/mp3/001001.mp3')).toBe(
      true
    )
    expect(isAllowedAudioUrl('https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3')).toBe(
      true
    )
  })

  it('rejects non-https, unknown hosts, and garbage', () => {
    expect(isAllowedAudioUrl('http://download.quranicaudio.com/quran/a.mp3')).toBe(false)
    expect(isAllowedAudioUrl('https://evil.example/a.mp3')).toBe(false)
    expect(isAllowedAudioUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedAudioUrl(null)).toBe(false)
  })

  it('filters arrays down to allowlisted URLs', () => {
    expect(
      filterAllowedAudioUrls([
        'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
        'https://evil.example/x.mp3',
        null
      ])
    ).toEqual(['https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3'])
  })
})
