import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove
} from './storage.js'

const KEY = 'storage-test-key'

// Simulate Chrome with site data blocked, where even reading window.localStorage
// throws a SecurityError (so optional chaining does not help).
function blockStorageAccess() {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('Access is denied for this document.', 'SecurityError')
    }
  })
  return () => {
    if (original) {
      Object.defineProperty(window, 'localStorage', original)
    } else {
      delete window.localStorage
    }
  }
}

afterEach(() => {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  vi.restoreAllMocks()
})

describe('safeLocalStorage helpers', () => {
  it('round-trips a value through localStorage', () => {
    expect(safeLocalStorageSet(KEY, '1')).toBe(true)
    expect(safeLocalStorageGet(KEY)).toBe('1')
    expect(safeLocalStorageRemove(KEY)).toBe(true)
    expect(safeLocalStorageGet(KEY)).toBe(null)
  })

  it('returns null for a missing key', () => {
    expect(safeLocalStorageGet('never-written-key')).toBe(null)
  })

  it('does not throw when the localStorage getter itself throws', () => {
    const restore = blockStorageAccess()
    try {
      expect(safeLocalStorageGet(KEY)).toBe(null)
      expect(safeLocalStorageSet(KEY, '1')).toBe(false)
      expect(safeLocalStorageRemove(KEY)).toBe(false)
    } finally {
      restore()
    }
  })

  it('does not throw when setItem throws (private mode quota)', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError')
    })
    expect(safeLocalStorageSet(KEY, '1')).toBe(false)
  })
})
