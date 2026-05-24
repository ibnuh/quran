import { describe, it, expect } from 'vitest'
import { getResponsiveDefaults, getPreloadCount } from './config.js'

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
