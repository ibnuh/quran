import {
  AUDIO_RUNTIME_CACHE_NAMES,
  SW_JUST_UPDATED_KEY,
  PWA_UPDATE_DISMISSED_KEY
} from '../config.js'
import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from './storage.js'

export const BEFORE_SW_UPDATE_EVENT = 'quran-before-sw-update'

export function notifyBeforeSwUpdate() {
  try {
    window.dispatchEvent(new Event(BEFORE_SW_UPDATE_EVENT))
  } catch {
    // Non-browser/test environments - ignore.
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
    // Private mode / missing Cache API - ignore.
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
 * Cheap stable fingerprint of a waiting SW script body so we can tell
 * "same update we already dismissed" from a genuinely newer waiting worker.
 * scriptURL alone is always /sw.js and cannot distinguish builds.
 */
export function fingerprintSwScript(text) {
  if (typeof text !== 'string' || !text) {
    return null
  }
  let h = text.length >>> 0
  // Sample the body so two different SW builds almost never collide.
  for (let i = 0; i < text.length; i += 61) {
    h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0
  }
  h = (Math.imul(h, 33) ^ text.charCodeAt(text.length - 1)) >>> 0
  return `${text.length.toString(36)}-${h.toString(36)}`
}

export async function fingerprintWaitingServiceWorker(registration) {
  const waiting = registration?.waiting
  if (!waiting?.scriptURL) {
    return null
  }
  try {
    const res = await fetch(waiting.scriptURL, { cache: 'no-store' })
    if (!res.ok) {
      return `url:${waiting.scriptURL}`
    }
    const text = await res.text()
    return fingerprintSwScript(text) || `url:${waiting.scriptURL}`
  } catch {
    return `url:${waiting.scriptURL}`
  }
}

export function getDismissedUpdateFingerprint() {
  return safeLocalStorageGet(PWA_UPDATE_DISMISSED_KEY) || null
}

export function dismissUpdateFingerprint(fingerprint) {
  if (!fingerprint) {
    return
  }
  safeLocalStorageSet(PWA_UPDATE_DISMISSED_KEY, fingerprint)
}

export function clearDismissedUpdateFingerprint() {
  safeLocalStorageRemove(PWA_UPDATE_DISMISSED_KEY)
}

/**
 * Whether the update toast should open for the current waiting worker.
 * Suppresses: no waiting worker, boot right after a user-accepted update,
 * and a waiting worker the user already dismissed with Later.
 */
export async function shouldAnnounceServiceWorkerUpdate(registration) {
  if (!registration?.waiting) {
    return { announce: false, fingerprint: null }
  }
  // Right after Update, the next boot still has SW_JUST_UPDATED set. Workbox
  // can re-fire "waiting" during that window and would otherwise re-open the toast.
  if (isSwJustUpdated()) {
    return { announce: false, fingerprint: null }
  }
  const fingerprint = await fingerprintWaitingServiceWorker(registration)
  if (fingerprint && fingerprint === getDismissedUpdateFingerprint()) {
    return { announce: false, fingerprint }
  }
  return { announce: true, fingerprint }
}

/**
 * Activate a waiting service worker after user consent: clear audio caches,
 * post SKIP_WAITING, and reload on controllerchange (with timeout fallback).
 * @param {{ waiting?: ServiceWorker | null, updateSW?: ((reload?: boolean) => unknown) | null, reloadTimeoutMs?: number }} [opts]
 */
export async function applyWaitingServiceWorker(opts = {}) {
  // Give skipWaiting + clientsClaim time to finish. A short forced reload while
  // the worker is still waiting is what re-opens the "ready to install" toast.
  const reloadTimeoutMs = opts.reloadTimeoutMs ?? 8000
  let waiting = opts.waiting || null
  const updateSW = opts.updateSW

  notifyBeforeSwUpdate()
  markSwJustUpdated()
  clearDismissedUpdateFingerprint()
  await clearAudioRuntimeCaches()

  let reloaded = false
  const reloadOnce = () => {
    if (reloaded) {
      return
    }
    reloaded = true
    window.location.reload()
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, { once: true })

    if (!waiting) {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        waiting = reg?.waiting || null
      } catch {
        waiting = null
      }
    }
  }

  // Prefer the vite-plugin-pwa helper (messageSkipWaiting). Fall back to a direct
  // postMessage when callers only have the waiting worker (Settings force-update).
  if (typeof updateSW === 'function') {
    await Promise.resolve(updateSW(true))
  } else if (waiting && typeof waiting.postMessage === 'function') {
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    setTimeout(() => {
      if (reloaded) {
        return
      }
      // Only force-reload if the new worker has taken control or is no longer waiting.
      navigator.serviceWorker
        .getRegistration()
        .then(reg => {
          const controlled = !!navigator.serviceWorker.controller
          const stillWaiting = !!reg?.waiting
          if (controlled && !stillWaiting) {
            reloadOnce()
            return
          }
          // Last resort: still reload so the user is not stuck on "Updating..."
          reloadOnce()
        })
        .catch(() => {
          reloadOnce()
        })
    }, reloadTimeoutMs)
  }
}
