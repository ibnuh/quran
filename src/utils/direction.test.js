import { describe, it, expect, afterEach } from 'vitest'
import { isRtlDocument } from './direction.js'

describe('isRtlDocument', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  it('is false when no dir attribute is set', () => {
    expect(isRtlDocument()).toBe(false)
  })

  it('is false for ltr', () => {
    document.documentElement.setAttribute('dir', 'ltr')
    expect(isRtlDocument()).toBe(false)
  })

  it('is true for rtl (case-insensitive)', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    expect(isRtlDocument()).toBe(true)
    document.documentElement.setAttribute('dir', 'RTL')
    expect(isRtlDocument()).toBe(true)
  })

  it('follows live attribute changes', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    expect(isRtlDocument()).toBe(true)
    document.documentElement.setAttribute('dir', 'ltr')
    expect(isRtlDocument()).toBe(false)
  })
})
