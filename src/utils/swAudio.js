import { AUDIO_RUNTIME_CACHE_NAMES, SW_JUST_UPDATED_KEY } from '../config.js'

export const BEFORE_SW_UPDATE_EVENT = 'quran-before-sw-update'

export function notifyBeforeSwUpdate() {
  try {
    window.dispatchEvent(new Event(BEFORE_SW_UPDATE_EVENT))
  } catch {
    // Non-browser/test environments — ignore.
  }
}

/**
 * Drop Workbox runtime caches that hold full-surah / per-verse MP3s.
 * After a service-worker update, CacheFirst + range responses for the same URL
 * can leave the media demuxer unable to read mid-file seeks until a hard reload.
 */
export async function clearAudioRuntimeCaches() {
  if (typeof caches === 'undefined') {
    return []
  }
  const deleted = []
  try {
    const keys = await caches.keys()
    // Exact names only: substring matching also wiped non-MP3 caches such as
    // quran-audio-api (JSON/API responses).
    for (const name of keys) {
      if (AUDIO_RUNTIME_CACHE_NAMES.includes(name)) {
        await caches.delete(name)
        deleted.push(name)
      }
    }
  } catch {
    // Private mode / missing Cache API — ignore.
  }
  return deleted
}

export function markSwJustUpdated() {
  try {
    sessionStorage.setItem(SW_JUST_UPDATED_KEY, '1')
  } catch {
    // ignore
  }
}

export function consumeSwJustUpdated() {
  try {
    const v = sessionStorage.getItem(SW_JUST_UPDATED_KEY)
    if (v) {
      sessionStorage.removeItem(SW_JUST_UPDATED_KEY)
      return true
    }
  } catch {
    // ignore
  }
  return false
}

export function isSwJustUpdated() {
  try {
    return sessionStorage.getItem(SW_JUST_UPDATED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Activate a waiting service worker after user consent: clear audio caches,
 * post SKIP_WAITING, and reload on controllerchange (with timeout fallback).
 * @param {{ waiting?: ServiceWorker | null, updateSW?: ((reload?: boolean) => unknown) | null, reloadTimeoutMs?: number }} [opts]
 */
export async function applyWaitingServiceWorker(opts = {}) {
  const reloadTimeoutMs = opts.reloadTimeoutMs ?? 2500
  let waiting = opts.waiting || null
  const updateSW = opts.updateSW

  notifyBeforeSwUpdate()
  markSwJustUpdated()
  await clearAudioRuntimeCaches()

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const reloadOnce = () => {
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, { once: true })
    setTimeout(reloadOnce, reloadTimeoutMs)

    if (!waiting) {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        waiting = reg?.waiting || null
      } catch {
        waiting = null
      }
    }
  }

  // Post SKIP_WAITING even when ServiceWorker registration APIs are unavailable
  // (tests / restricted environments), as long as a waiting worker was provided.
  if (waiting && typeof waiting.postMessage === 'function') {
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  if (typeof updateSW === 'function') {
    await Promise.resolve(updateSW(true))
  }
}
