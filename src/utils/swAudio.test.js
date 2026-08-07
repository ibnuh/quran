import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  clearAudioRuntimeCaches,
  markSwJustUpdated,
  consumeSwJustUpdated,
  isSwJustUpdated,
  notifyBeforeSwUpdate,
  applyWaitingServiceWorker,
  BEFORE_SW_UPDATE_EVENT
} from './swAudio.js'
import { SW_JUST_UPDATED_KEY } from '../config.js'

describe('swAudio', () => {
  const originalCaches = globalThis.caches
  const originalSession = globalThis.sessionStorage

  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    globalThis.caches = originalCaches
    // sessionStorage is restored by happy-dom; just clear it
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('clearAudioRuntimeCaches deletes exact audio cache names only', async () => {
    const deleted = []
    const store = new Map([
      ['quran-audio-files', true],
      ['quran-verse-audio-files', true],
      ['quran-audio-api', true],
      ['workbox-precache-v2', true],
      ['google-fonts-css', true],
      ['something-quran-audio-extra', true]
    ])
    globalThis.caches = {
      keys: async () => Array.from(store.keys()),
      delete: async name => {
        deleted.push(name)
        store.delete(name)
        return true
      }
    }

    const result = await clearAudioRuntimeCaches()
    expect(result.sort()).toEqual(['quran-audio-files', 'quran-verse-audio-files'].sort())
    expect(deleted.sort()).toEqual(result.sort())
    // API / unrelated caches must stay (substring matching used to wipe quran-audio-api).
    expect(store.has('quran-audio-api')).toBe(true)
    expect(store.has('workbox-precache-v2')).toBe(true)
    expect(store.has('google-fonts-css')).toBe(true)
    expect(store.has('something-quran-audio-extra')).toBe(true)
  })

  it('applyWaitingServiceWorker notifies, clears audio caches, and posts SKIP_WAITING', async () => {
    const postMessage = vi.fn()
    const waiting = { postMessage }
    const store = new Map([
      ['quran-audio-files', true],
      ['workbox-precache-v2', true]
    ])
    globalThis.caches = {
      keys: async () => Array.from(store.keys()),
      delete: async name => {
        store.delete(name)
        return true
      }
    }
    const updateSW = vi.fn(async () => {})
    const beforeHandler = vi.fn()
    window.addEventListener(BEFORE_SW_UPDATE_EVENT, beforeHandler)

    await applyWaitingServiceWorker({
      waiting,
      updateSW,
      reloadTimeoutMs: 50
    })

    expect(beforeHandler).toHaveBeenCalledTimes(1)
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(updateSW).toHaveBeenCalledWith(true)
    expect(isSwJustUpdated()).toBe(true)
    expect(store.has('quran-audio-files')).toBe(false)
    expect(store.has('workbox-precache-v2')).toBe(true)

    window.removeEventListener(BEFORE_SW_UPDATE_EVENT, beforeHandler)
  })

  it('clearAudioRuntimeCaches returns [] when Cache API is missing', async () => {
    // eslint-disable-next-line no-undefined
    globalThis.caches = undefined
    await expect(clearAudioRuntimeCaches()).resolves.toEqual([])
  })

  it('marks, reads, and consumes the SW-just-updated session flag', () => {
    expect(isSwJustUpdated()).toBe(false)
    markSwJustUpdated()
    expect(sessionStorage.getItem(SW_JUST_UPDATED_KEY)).toBe('1')
    expect(isSwJustUpdated()).toBe(true)
    expect(consumeSwJustUpdated()).toBe(true)
    expect(isSwJustUpdated()).toBe(false)
    expect(consumeSwJustUpdated()).toBe(false)
  })

  it('notifyBeforeSwUpdate dispatches the before-update event', () => {
    const handler = vi.fn()
    window.addEventListener(BEFORE_SW_UPDATE_EVENT, handler)
    notifyBeforeSwUpdate()
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener(BEFORE_SW_UPDATE_EVENT, handler)
  })
})
