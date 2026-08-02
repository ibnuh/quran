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
    for (const name of keys) {
      const isAudioCache =
        AUDIO_RUNTIME_CACHE_NAMES.includes(name) ||
        name.includes('quran-audio') ||
        name.includes('quran-verse-audio')
      if (isAudioCache) {
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
