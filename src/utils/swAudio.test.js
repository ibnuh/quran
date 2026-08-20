import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  clearAudioRuntimeCaches,
  markSwJustUpdated,
  consumeSwJustUpdated,
  isSwJustUpdated,
  notifyBeforeSwUpdate,
  applyWaitingServiceWorker,
  fingerprintSwScript,
  shouldAnnounceServiceWorkerUpdate,
  dismissUpdateFingerprint,
  clearDismissedUpdateFingerprint,
  getDismissedUpdateFingerprint,
  BEFORE_SW_UPDATE_EVENT
} from './swAudio.js'
import { SW_JUST_UPDATED_KEY, PWA_UPDATE_DISMISSED_KEY } from '../config.js'

describe('swAudio', () => {
  const originalCaches = globalThis.caches

  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  afterEach(() => {
    globalThis.caches = originalCaches
    sessionStorage.clear()
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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
    // When updateSW is provided it is the skip path; direct postMessage is the fallback.
    expect(updateSW).toHaveBeenCalledWith(true)
    expect(postMessage).not.toHaveBeenCalled()
    expect(isSwJustUpdated()).toBe(true)
    expect(store.has('quran-audio-files')).toBe(false)
    expect(store.has('workbox-precache-v2')).toBe(true)

    window.removeEventListener(BEFORE_SW_UPDATE_EVENT, beforeHandler)
  })

  it('applyWaitingServiceWorker posts SKIP_WAITING when updateSW is missing', async () => {
    const postMessage = vi.fn()
    const waiting = { postMessage }
    globalThis.caches = {
      keys: async () => [],
      delete: async () => true
    }

    await applyWaitingServiceWorker({
      waiting,
      reloadTimeoutMs: 50
    })

    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
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

  it('fingerprintSwScript is stable for the same body and differs across builds', () => {
    const a = fingerprintSwScript('workbox-precache-manifest:abc123' + 'x'.repeat(200))
    const b = fingerprintSwScript('workbox-precache-manifest:abc123' + 'x'.repeat(200))
    const c = fingerprintSwScript('workbox-precache-manifest:zzz999' + 'y'.repeat(200))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(fingerprintSwScript('')).toBe(null)
  })

  it('shouldAnnounceServiceWorkerUpdate suppresses when no worker is waiting', async () => {
    const result = await shouldAnnounceServiceWorkerUpdate({ waiting: null })
    expect(result).toEqual({ announce: false, fingerprint: null })
  })

  it('shouldAnnounceServiceWorkerUpdate suppresses right after a user-accepted update', async () => {
    markSwJustUpdated()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => 'sw-body-v2-' + 'z'.repeat(120)
      }))
    )
    const result = await shouldAnnounceServiceWorkerUpdate({
      waiting: { scriptURL: 'https://quran.ibnuhx.com/sw.js' }
    })
    expect(result.announce).toBe(false)
  })

  it('shouldAnnounceServiceWorkerUpdate suppresses a waiting SW the user already dismissed', async () => {
    const body = 'sw-body-dismissed-' + 'a'.repeat(150)
    const fp = fingerprintSwScript(body)
    dismissUpdateFingerprint(fp)
    expect(getDismissedUpdateFingerprint()).toBe(fp)

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => body
      }))
    )

    const result = await shouldAnnounceServiceWorkerUpdate({
      waiting: { scriptURL: 'https://quran.ibnuhx.com/sw.js' }
    })
    expect(result.announce).toBe(false)
    expect(result.fingerprint).toBe(fp)
  })

  it('shouldAnnounceServiceWorkerUpdate allows a newer waiting SW after Later', async () => {
    dismissUpdateFingerprint(fingerprintSwScript('old-sw-' + 'a'.repeat(150)))
    const newBody = 'new-sw-' + 'b'.repeat(150)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => newBody
      }))
    )

    const result = await shouldAnnounceServiceWorkerUpdate({
      waiting: { scriptURL: 'https://quran.ibnuhx.com/sw.js' }
    })
    expect(result.announce).toBe(true)
    expect(result.fingerprint).toBe(fingerprintSwScript(newBody))
  })

  it('applyWaitingServiceWorker clears a dismissed Later fingerprint', async () => {
    dismissUpdateFingerprint('stale-fp')
    expect(localStorage.getItem(PWA_UPDATE_DISMISSED_KEY)).toBe('stale-fp')
    globalThis.caches = {
      keys: async () => [],
      delete: async () => true
    }
    await applyWaitingServiceWorker({
      waiting: { postMessage: vi.fn() },
      reloadTimeoutMs: 50
    })
    expect(getDismissedUpdateFingerprint()).toBe(null)
    clearDismissedUpdateFingerprint()
  })
})
