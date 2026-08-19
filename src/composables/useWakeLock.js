import { watch, onMounted, onBeforeUnmount } from 'vue'

// Keep the screen awake during playback using the Screen Wake Lock API.
// Re-acquires the lock when the tab becomes visible again (locks are released
// automatically when a tab is backgrounded).
export function useWakeLock(isPlayingRef) {
  let wakeLock = null
  // Generation counter: release() and every new acquire() bump it so a request
  // that resolves late (after pause or after a newer request) is discarded.
  let requestGen = 0

  async function acquire() {
    if (!('wakeLock' in navigator)) {
      return
    }
    if (wakeLock) {
      return
    }
    const gen = ++requestGen
    try {
      const lock = await navigator.wakeLock.request('screen')
      // Playback stopped or another acquire superseded this one while the
      // request was in flight; keeping this lock would leave the screen
      // awake with nothing playing.
      if (gen !== requestGen || !isPlayingRef.value) {
        void Promise.resolve(lock.release()).catch(() => {})
        return
      }
      wakeLock = lock
      lock.addEventListener('release', () => {
        if (wakeLock === lock) {
          wakeLock = null
        }
      })
    } catch {
      // Wake lock can fail (low battery, background tab); ignore.
    }
  }

  function release() {
    requestGen += 1
    if (wakeLock) {
      void Promise.resolve(wakeLock.release()).catch(() => {})
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
