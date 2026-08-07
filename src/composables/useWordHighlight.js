import { watch, onBeforeUnmount } from 'vue'
import { SAVE_PREFS_DEBOUNCE } from '../config.js'
import { t } from '../i18n/index.js'

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
      announce(
        t('sr.verseChange', {
          verse: store.currentVerse?.number || idx + 1,
          total: store.totalVerses,
          surah: surah.englishName
        })
      )
    }
  }

  // Avoid thrashing reactive subscribers: only write when the value actually changes.
  function setWordIndex(idx) {
    if (store.currentWordIndex !== idx) {
      store.currentWordIndex = idx
    }
  }

  function resolveVerseIndex(timeMs) {
    // Right after a manual verse seek, keep the explicitly-set index so MP3
    // seek undershoot does not bounce it back to the previous verse.
    if (audio.isVerseSeekActive()) {
      return store.currentVerseIndex
    }
    // Single-verse repeat locks the highlighted verse; usePlayback seeks the
    // playhead back when it leaves the window.
    if (store.repeatMode === 'verse' && !store.abRepeat) {
      return store.currentVerseIndex
    }
    // A-B repeat: clamp index inside the selected range while playing.
    if (store.abRepeat) {
      const raw = store.getVerseIndexAtTime(timeMs)
      return Math.min(store.abRepeat.end, Math.max(store.abRepeat.start, raw))
    }
    return store.getVerseIndexAtTime(timeMs)
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
        const idx = resolveVerseIndex(timeMs)
        if (idx !== store.currentVerseIndex) {
          store.currentVerseIndex = idx
          setWordIndex(-1)
          debouncedSavePrefs()
          announceVerse(idx)
        }
        setWordIndex(store.getWordIndexAtTime(timeMs, idx))
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
      const idx = resolveVerseIndex(timeMs)
      if (idx !== store.currentVerseIndex) {
        store.currentVerseIndex = idx
        setWordIndex(-1)
        debouncedSavePrefs()
        announceVerse(idx)
      }
      if (store.wordHighlight) {
        setWordIndex(store.getWordIndexAtTime(timeMs, idx))
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
