import { watch, onMounted, onBeforeUnmount } from 'vue'

// Keep the screen awake during playback using the Screen Wake Lock API.
// Re-acquires the lock when the tab becomes visible again (locks are released
// automatically when a tab is backgrounded).
export function useWakeLock(isPlayingRef) {
  let wakeLock = null

  async function acquire() {
    if (!('wakeLock' in navigator)) {
      return
    }
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => {
        wakeLock = null
      })
    } catch {
      // Wake lock can fail (low battery, background tab); ignore.
      wakeLock = null
    }
  }

  function release() {
    if (wakeLock) {
      wakeLock.release()
      wakeLock = null
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible' && isPlayingRef.value) {
      acquire()
    }
  }

  watch(isPlayingRef, playing => {
    if (playing) {
      acquire()
    } else {
      release()
    }
  })

  onMounted(() => {
    if ('wakeLock' in navigator) {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  })

  onBeforeUnmount(() => {
    release()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { release }
}
