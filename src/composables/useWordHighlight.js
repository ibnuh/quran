import { watch, onBeforeUnmount } from 'vue'
import { SAVE_PREFS_DEBOUNCE } from '../config.js'

// Drives verse/word highlighting from audio playback time.
// In "full" mode with word highlighting on, a requestAnimationFrame loop runs for
// ~16ms precision; otherwise it falls back to the audio timeupdate event.
export function useWordHighlight(store, audio, announce) {
  let rafId = null
  let savePrefTimer = null
  let lastRafTimeMs = -1

  function debouncedSavePrefs() {
    clearTimeout(savePrefTimer)
    savePrefTimer = setTimeout(() => store.savePreferences(), SAVE_PREFS_DEBOUNCE)
  }

  function announceVerse(idx) {
    const surah = store.currentSurah
    if (surah) {
      announce(`Verse ${store.currentVerse?.number || idx + 1} of ${store.totalVerses}, ${surah.englishName}`)
    }
  }

  function startLoop() {
    if (rafId) {
      return
    }
    lastRafTimeMs = -1
    function tick() {
      const timeMs = audio.getLiveTimeMs()
      if (timeMs !== lastRafTimeMs) {
        lastRafTimeMs = timeMs
        const idx = store.getVerseIndexAtTime(timeMs)
        if (idx !== store.currentVerseIndex) {
          store.currentVerseIndex = idx
          store.currentWordIndex = -1
          debouncedSavePrefs()
          announceVerse(idx)
        }
        store.currentWordIndex = store.getWordIndexAtTime(timeMs, idx)
        const dur = audio.duration.value
        if (dur > 0) {
          audio.progress.value = (timeMs / dur) * 100
          audio.currentTimeMs.value = timeMs
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  function stopLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  // Fallback path when the RAF loop is not active (e.g. word highlight disabled).
  audio.onTimeUpdate(timeMs => {
    if (rafId) {
      return
    }
    if (store.playbackMode === 'full') {
      const idx = store.getVerseIndexAtTime(timeMs)
      if (idx !== store.currentVerseIndex) {
        store.currentVerseIndex = idx
        store.currentWordIndex = -1
        debouncedSavePrefs()
        announceVerse(idx)
      }
      if (store.wordHighlight) {
        store.currentWordIndex = store.getWordIndexAtTime(timeMs, idx)
      }
    }
  })

  watch(
    [() => audio.isPlaying.value, () => store.wordHighlight, () => store.playbackMode],
    ([playing, highlight, mode]) => {
      if (playing && highlight && mode === 'full') {
        startLoop()
      } else {
        stopLoop()
      }
    }
  )

  onBeforeUnmount(() => {
    stopLoop()
    clearTimeout(savePrefTimer)
  })
}
