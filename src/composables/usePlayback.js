import { ref, watch, onBeforeUnmount } from 'vue'
import { getPreloadCount } from '../config.js'
import { safeLocalStorageGet } from '../utils/storage.js'
import JUZS from '../data/juzs.js'

// Playback orchestration: play/pause, verse and surah navigation, repeat handling,
// continuous cross-surah playback, and verse-mode audio preloading.
export function usePlayback(store, audio) {
  const continuingPlayback = ref(false)
  // Surah that just finished when continuous play was requested. Resume only after
  // currentSurahNum advances past this value so we never replay the ended surah.
  let continueFromSurah = null
  let bookmarkJumpGen = 0

  // -- Verse-by-verse preloader --
  const preloadCache = []

  function clearPreload() {
    preloadCache.forEach(a => {
      a.src = ''
      a.load()
    })
    preloadCache.length = 0
  }

  function preloadAhead() {
    if (store.playbackMode !== 'verse') {
      return
    }
    clearPreload()
    const count = getPreloadCount()
    const start = store.currentVerseIndex + 1
    const end = Math.min(start + count, store.audioUrls.length)
    for (let i = start; i < end; i++) {
      const a = new Audio()
      a.preload = 'auto'
      a.src = store.audioUrls[i]
      preloadCache.push(a)
    }
  }

  // -- Preload next surah near the end of the current one --
  let preloadedNext = false
  watch(
    () => store.currentVerseIndex,
    idx => {
      if (!preloadedNext && store.totalVerses > 0 && idx >= store.totalVerses - 3) {
        preloadedNext = true
        store.preloadNextSurah()
      }
    }
  )
  watch(
    () => store.currentSurahNum,
    () => {
      preloadedNext = false
    }
  )

  function hasPlayableAudio() {
    return store.canPlayAudio
  }

  // True when the playhead is already inside the current verse window (within 750ms).
  function isNearCurrentVerse() {
    const timing = store.verseTimings[store.currentVerseIndex]
    if (!timing) {
      return false
    }
    // If the media element is poisoned (post-SW-update demuxer error), never treat
    // the playhead as trustworthy — always pass an explicit startMs on the next play.
    if (typeof audio.hasMediaError === 'function' && audio.hasMediaError()) {
      return false
    }
    if (typeof audio.isHealthy === 'function' && !audio.isHealthy()) {
      return false
    }
    const t = audio.currentTimeMs.value
    const from = timing.timestampFrom
    const to =
      timing.timestampTo != null
        ? timing.timestampTo
        : store.verseTimings[store.currentVerseIndex + 1]?.timestampFrom
    if (t + 750 < from) {
      return false
    }
    if (to != null && t > to + 250) {
      return false
    }
    return true
  }

  function clearContinuingPlayback() {
    continuingPlayback.value = false
    continueFromSurah = null
  }

  async function resumeContinuingPlayback() {
    if (!continuingPlayback.value) {
      return
    }
    // nextSurah has not advanced yet (watcher can fire on the flag flip alone).
    if (continueFromSurah != null && store.currentSurahNum === continueFromSurah) {
      return
    }
    if (store.isLoading) {
      return
    }
    if (store.error || store.audioUnavailable) {
      clearContinuingPlayback()
      return
    }

    if (store.playbackMode === 'full' && store.audioUrl) {
      clearContinuingPlayback()
      await audio.loadAndPlay(store.audioUrl)
      return
    }

    if (store.playbackMode === 'verse' && store.audioUrls.length > 0) {
      clearContinuingPlayback()
      store.currentVerseIndex = 0
      store.currentWordIndex = -1
      const ok = await audio.loadAndPlay(store.audioUrls[0])
      if (ok) {
        preloadAhead()
      }
      return
    }

    // Mode not ready yet (e.g. load still settling); leave flag for a later tick.
    if (!store.playbackMode) {
      return
    }
    clearContinuingPlayback()
  }

  // -- Controls --
  function togglePlay() {
    const debugOn =
      typeof window !== 'undefined' &&
      (safeLocalStorageGet('quran-debug-audio') === '1' ||
        /(?:\?|&)debugAudio=1(?:&|$)/.test(window.location?.search || ''))
    if (debugOn) {
      console.info('[playback] togglePlay', {
        isPlaying: audio.isPlaying.value,
        hasPlayable: hasPlayableAudio(),
        mode: store.playbackMode,
        audioUrl: store.audioUrl ? String(store.audioUrl).slice(-50) : null,
        verseIndex: store.currentVerseIndex,
        timings: store.verseTimings?.length || 0,
        near: isNearCurrentVerse(),
        currentTimeMs: audio.currentTimeMs.value,
        audioUnavailable: store.audioUnavailable
      })
    }
    if (audio.isPlaying.value) {
      audio.pause()
      return
    }
    if (!hasPlayableAudio()) {
      if (debugOn) {
        console.warn('[playback] blocked: no playable audio', {
          audioUnavailable: store.audioUnavailable,
          mode: store.playbackMode,
          audioUrl: store.audioUrl,
          audioUrls: store.audioUrls?.length
        })
      }
      return
    }
    if (store.playbackMode === 'full' && store.audioUrl) {
      // Start at the selected ayah when the playhead is elsewhere (e.g. user jumped
      // to ayah 6, or we restored position before the file was ready).
      // playAt() must call HTMLMediaElement.play() inside this click stack so the
      // browser keeps user-gesture activation (awaiting network first blocks autoplay).
      const timing = store.verseTimings[store.currentVerseIndex]
      const startMs = !isNearCurrentVerse() && timing ? timing.timestampFrom : null
      if (debugOn) {
        console.info('[playback] full playAt', { startMs, timingFrom: timing?.timestampFrom })
      }
      void audio.playAt(store.audioUrl, startMs).then(ok => {
        if (debugOn) {
          console.info('[playback] playAt result', ok, window.__getAudioSnapshot?.())
        }
      })
    } else if (store.playbackMode === 'verse' && store.audioUrls.length) {
      void audio.loadAndPlay(store.audioUrls[store.currentVerseIndex]).then(ok => {
        if (debugOn) {
          console.info('[playback] verse loadAndPlay result', ok)
        }
      })
      preloadAhead()
    }
  }

  function handlePrevVerse() {
    store.prevVerse()
    if (store.playbackMode === 'full') {
      const timing = store.verseTimings[store.currentVerseIndex]
      if (timing) {
        audio.seekTo(timing.timestampFrom)
      }
    } else if (audio.isPlaying.value) {
      audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
      preloadAhead()
    }
  }

  function handleNextVerse() {
    // At the last verse there is nowhere to advance; seeking or reloading here
    // would restart the verse that is already playing (keyboard/swipe path,
    // since the UI button is disabled at the boundary).
    if (!store.canNextVerse) {
      return
    }
    store.nextVerse()
    if (store.playbackMode === 'full') {
      const timing = store.verseTimings[store.currentVerseIndex]
      if (timing) {
        audio.seekTo(timing.timestampFrom)
      }
    } else if (audio.isPlaying.value) {
      audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
      preloadAhead()
    }
  }

  function handlePrevSurah() {
    audio.stop()
    store.prevSurah()
  }

  function handleNextSurah() {
    audio.stop()
    store.nextSurah()
  }

  // Select a verse. By default starts (or continues) playback.
  // Pass { play: false } for read-mode focus without auto-play.
  function handleVerseSelect(index, options = {}) {
    const play = options.play !== false
    store.setVerse(index)
    if (!play || !hasPlayableAudio()) {
      return
    }
    if (store.playbackMode === 'full' && store.audioUrl) {
      const timing = store.verseTimings[index]
      const startMs = timing ? timing.timestampFrom : null
      void audio.playAt(store.audioUrl, startMs)
    } else {
      void audio.loadAndPlay(store.audioUrls[index])
      preloadAhead()
    }
  }

  // Start playback from the current (or given) verse. Used by Read mode "Play from here".
  function playFromVerse(index = store.currentVerseIndex) {
    handleVerseSelect(index, { play: true })
  }

  function handleJumpToVerse(index) {
    store.setVerse(index)
    const wasPlaying = audio.isPlaying.value
    if (store.playbackMode === 'full' && store.audioUrl) {
      const timing = store.verseTimings[index]
      const startMs = timing ? timing.timestampFrom : 0
      if (wasPlaying) {
        void audio.playAt(store.audioUrl, startMs)
      } else {
        audio.load(store.audioUrl)
        audio.seekTo(startMs)
      }
    } else if (store.audioUrls.length) {
      if (wasPlaying) {
        void audio.loadAndPlay(store.audioUrls[index])
        preloadAhead()
      }
    }
  }

  // Jump to a juz. When the juz starts inside the current surah, go through the
  // verse seek path: writing only the index would be snapped back to the playhead
  // by the word-highlight loop within one frame. Cross-surah jumps keep using
  // setJuz, which loads the new surah and persists the target verse.
  async function handleGoToJuz(num) {
    const juz = JUZS.find(j => j.number === num)
    if (!juz) {
      return
    }
    if (juz.startSurah === store.currentSurahNum) {
      const idx = store.verses.findIndex(v => v.number === juz.startVerse)
      if (idx >= 0) {
        handleJumpToVerse(idx)
        return
      }
    }
    audio.stop()
    await store.setJuz(num)
  }

  async function handleGoToBookmark(surahNum, verseIndex) {
    if (surahNum === store.currentSurahNum) {
      handleJumpToVerse(verseIndex)
      return
    }

    audio.stop()
    const gen = ++bookmarkJumpGen
    let unsub = null
    const cleanup = () => {
      if (unsub) {
        unsub()
        unsub = null
      }
    }
    try {
      // Watch covers edge cases where isLoading flips after setSurah settles.
      unsub = watch(
        () => store.isLoading,
        loading => {
          if (loading || gen !== bookmarkJumpGen) {
            return
          }
          cleanup()
          if (!store.error) {
            handleJumpToVerse(verseIndex)
          }
        }
      )
      await store.setSurah(surahNum)
      if (gen !== bookmarkJumpGen) {
        cleanup()
        return
      }
      if (store.isLoading) {
        // Let the watcher finish the jump when loading ends.
        return
      }
      cleanup()
      if (!store.error) {
        handleJumpToVerse(verseIndex)
      }
    } catch {
      // Ignore abort/network errors; UI already surfaces store.error.
      cleanup()
    }
  }

  function handleSeek(ratio) {
    if (store.playbackMode === 'full' && store.audioUrl) {
      // A scrub is an explicit user action, so it is safe to attach the source here.
      // The target can then be queued against API duration while media bytes load.
      audio.load(store.audioUrl)
    }
    const targetMs = audio.seek(ratio)
    if (targetMs == null || store.playbackMode !== 'full') {
      return
    }
    const index = store.getVerseIndexAtTime(targetMs)
    if (index !== store.currentVerseIndex) {
      store.currentVerseIndex = index
      store.currentWordIndex = -1
      store.savePreferences()
    }
  }

  function handleSetSpeed(speed) {
    store.setPlaybackSpeed(speed)
    audio.setPlaybackRate(speed)
  }

  // -- Audio "ended" handling: repeat modes, verse advance, continuous playback --
  audio.onEnded(() => {
    // A-B repeat (memorization) takes precedence over other repeat modes.
    const ab = store.abRepeat
    if (ab) {
      if (store.playbackMode === 'full' && store.audioUrl) {
        const timing = store.verseTimings[ab.start]
        if (timing) {
          store.currentVerseIndex = ab.start
          store.currentWordIndex = -1
          void audio.playAt(store.audioUrl, timing.timestampFrom)
        }
        return
      }
      if (store.currentVerseIndex >= ab.end) {
        store.currentVerseIndex = ab.start
        store.currentWordIndex = -1
      } else {
        store.nextVerse()
      }
      void audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
      preloadAhead()
      return
    }

    if (store.repeatMode === 'verse') {
      if (store.playbackMode === 'full' && store.audioUrl) {
        const timing = store.verseTimings[store.currentVerseIndex]
        void audio.playAt(store.audioUrl, timing ? timing.timestampFrom : null)
      } else {
        void audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
      }
      return
    }

    if (store.repeatMode === 'surah') {
      store.currentVerseIndex = 0
      store.currentWordIndex = -1
      if (store.playbackMode === 'full' && store.audioUrl) {
        void audio.playAt(store.audioUrl, 0)
      } else if (store.audioUrls.length) {
        void audio.loadAndPlay(store.audioUrls[0])
        preloadAhead()
      }
      return
    }

    if (store.playbackMode === 'verse' && store.canNextVerse) {
      store.nextVerse()
      void audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
      preloadAhead()
      return
    }

    if (store.canNextSurah) {
      continueFromSurah = store.currentSurahNum
      continuingPlayback.value = true
      store.nextSurah()
      return
    }

    audio.stop()
    store.currentWordIndex = -1
  })

  // When the surah audio URL changes while the app is already running, keep the
  // element in sync. Do not eager-load on first mount (immediate): post-SW-update
  // mid-file restore seeks poison the element before the user hits Play.
  // Continuous cross-surah resume for full mode is handled by resumeContinuingPlayback.
  watch(
    () => store.audioUrl,
    (url, prev) => {
      if (!url || store.playbackMode !== 'full') {
        return
      }
      if (continuingPlayback.value) {
        return
      }
      // Skip the initial empty→url transition from loadSurah on boot.
      if (prev == null && !audio.isPlaying.value) {
        return
      }
      const wasPlaying = audio.isPlaying.value
      audio.stop()
      if (wasPlaying) {
        void audio.loadAndPlay(url)
      } else {
        audio.load(url)
      }
    }
  )

  // Resume continuous playback after the next surah finishes loading (full or verse).
  watch(
    () => [
      continuingPlayback.value,
      store.currentSurahNum,
      store.isLoading,
      store.playbackMode,
      store.audioUrl,
      store.audioUrls.length,
      store.error,
      store.audioUnavailable
    ],
    () => {
      if (!continuingPlayback.value) {
        return
      }
      void resumeContinuingPlayback()
    }
  )

  // Stop audio when the surah or reciter changes (unless we are auto-advancing).
  watch(
    () => [store.currentSurahNum, store.currentReciter],
    () => {
      if (continuingPlayback.value) {
        return
      }
      audio.stop()
    }
  )

  // The timing API knows the full duration before the media element has metadata.
  watch(
    () => store.audioDurationMs,
    ms => {
      audio.setExpectedDuration(ms)
    },
    { immediate: true }
  )

  // Keep the audio element's rate in sync with the stored speed.
  watch(
    () => store.playbackSpeed,
    speed => {
      audio.setPlaybackRate(speed)
    }
  )

  // Keep the audio element's volume in sync with the stored volume.
  watch(
    () => store.volume,
    v => {
      audio.setVolume(v)
    }
  )

  // A-B and single-verse repeat in full mode: when the playhead leaves the
  // active window, seek back. Ignore while seeking so scrubbing is not fought.
  watch(
    () => store.currentVerseIndex,
    idx => {
      if (store.playbackMode !== 'full' || !audio.isPlaying.value) {
        return
      }
      if (audio.isSeeking?.value || audio.isVerseSeekActive?.()) {
        return
      }

      const ab = store.abRepeat
      if (!ab) {
        return
      }
      if (idx > ab.end || idx < ab.start) {
        const timing = store.verseTimings[ab.start]
        if (timing) {
          store.currentVerseIndex = ab.start
          store.currentWordIndex = -1
          audio.seekTo(timing.timestampFrom)
        }
      }
    }
  )

  // Full-mode single-verse repeat: keep the playhead inside the current verse.
  // Also re-enforce A-B using live time (in case index did not tick yet).
  watch(
    () => audio.currentTimeMs.value,
    timeMs => {
      if (store.playbackMode !== 'full' || !audio.isPlaying.value) {
        return
      }
      if (audio.isSeeking?.value || audio.isVerseSeekActive?.()) {
        return
      }

      const ab = store.abRepeat
      if (ab) {
        const startTiming = store.verseTimings[ab.start]
        const endTiming = store.verseTimings[ab.end]
        if (!startTiming) {
          return
        }
        const endMs =
          endTiming?.timestampTo != null
            ? endTiming.timestampTo
            : store.verseTimings[ab.end + 1]?.timestampFrom
        if (endMs != null && timeMs >= endMs) {
          store.currentVerseIndex = ab.start
          store.currentWordIndex = -1
          audio.seekTo(startTiming.timestampFrom)
        }
        return
      }

      if (store.repeatMode !== 'verse') {
        return
      }
      const idx = store.currentVerseIndex
      const timing = store.verseTimings[idx]
      if (!timing) {
        return
      }
      const from = timing.timestampFrom
      const to =
        timing.timestampTo != null ? timing.timestampTo : store.verseTimings[idx + 1]?.timestampFrom
      if (to == null) {
        return
      }
      // Left the verse window: either undershoot after seek, or advanced past end.
      if (timeMs + 40 >= to || timeMs + 750 < from) {
        store.currentWordIndex = -1
        audio.seekTo(from)
      }
    }
  )

  onBeforeUnmount(clearPreload)

  return {
    continuingPlayback,
    preloadAhead,
    hasPlayableAudio,
    togglePlay,
    handlePrevVerse,
    handleNextVerse,
    handlePrevSurah,
    handleNextSurah,
    handleVerseSelect,
    playFromVerse,
    handleJumpToVerse,
    handleGoToJuz,
    handleGoToBookmark,
    handleSeek,
    handleSetSpeed
  }
}
