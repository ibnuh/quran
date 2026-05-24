import { describe, it, expect, vi, afterEach } from 'vitest'
import THEMES, { resolveThemeId } from './themes.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveThemeId', () => {
  it('returns concrete theme ids unchanged', () => {
    expect(resolveThemeId('dark')).toBe('dark')
    expect(resolveThemeId('sepia')).toBe('sepia')
  })

  it('resolves auto to dark when the OS prefers dark', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    expect(resolveThemeId('auto')).toBe('dark')
  })

  it('resolves auto to light when the OS prefers light', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(resolveThemeId('auto')).toBe('light')
  })
})

describe('THEMES data', () => {
  it('ships the ten built-in themes with required color tokens', () => {
    expect(THEMES.length).toBe(10)
    for (const theme of THEMES) {
      expect(theme.colors.primary).toBeTruthy()
      expect(theme.colors.surface).toBeTruthy()
    }
  })
})
