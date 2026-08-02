import { ref, watch, onBeforeUnmount } from 'vue'
import { getPreloadCount } from '../config.js'

// Playback orchestration: play/pause, verse and surah navigation, repeat handling,
// continuous cross-surah playback, and verse-mode audio preloading.
export function usePlayback(store, audio) {
  const continuingPlayback = ref(false)

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
    if (store.audioUnavailable || !store.playbackMode) {
      return false
    }
    if (store.playbackMode === 'full') {
      return !!store.audioUrl
    }
    return store.audioUrls.length > 0
  }

  // True when the playhead is already inside the current verse window (within 750ms).
  function isNearCurrentVerse() {
    const timing = store.verseTimings[store.currentVerseIndex]
    if (!timing) {
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

  // -- Controls --
  function togglePlay() {
    if (audio.isPlaying.value) {
      audio.pause()
      return
    }
    if (!hasPlayableAudio()) {
      return
    }
    if (store.playbackMode === 'full' && store.audioUrl) {
      // Start at the selected ayah when the playhead is elsewhere (e.g. user jumped
      // to ayah 6, or we restored position before the file was ready).
      // playAt() must call HTMLMediaElement.play() inside this click stack so the
      // browser keeps user-gesture activation (awaiting network first blocks autoplay).
      const timing = store.verseTimings[store.currentVerseIndex]
      const startMs = !isNearCurrentVerse() && timing ? timing.timestampFrom : null
      void audio.playAt(store.audioUrl, startMs)
    } else if (store.playbackMode === 'verse' && store.audioUrls.length) {
      void audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
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

  function handleGoToBookmark(surahNum, verseIndex) {
    if (surahNum !== store.currentSurahNum) {
      audio.stop()
      const unsub = watch(
        () => store.isLoading,
        loading => {
          if (!loading && !store.error) {
            handleJumpToVerse(verseIndex)
            unsub()
          }
        }
      )
      store.setSurah(surahNum)
      return
    }
    handleJumpToVerse(verseIndex)
  }

  function handleSeek(ratio) {
    audio.seek(ratio)
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
      continuingPlayback.value = true
      store.nextSurah()
      return
    }

    audio.stop()
    store.currentWordIndex = -1
  })

  // Preload full surah audio when its URL changes; continue playing if we were.
  watch(
    () => store.audioUrl,
    url => {
      if (url && store.playbackMode === 'full') {
        const wasPlaying = audio.isPlaying.value || continuingPlayback.value
        audio.stop()
        continuingPlayback.value = false
        if (wasPlaying) {
          void audio.loadAndPlay(url)
        } else {
          audio.load(url)
        }
      }
    },
    // Immediate: attach the current surah file as soon as the composable mounts so
    // the first Play after a reload/update does not hit an empty <audio> element.
    { immediate: true }
  )

  // Stop audio when the surah or reciter changes.
  watch(
    () => [store.currentSurahNum, store.currentReciter],
    () => {
      audio.stop()
    }
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

  // A-B repeat: loop a verse range while playing (full-mode boundary handling;
  // verse-mode loop is handled in the onEnded handler below).
  watch(
    () => store.currentVerseIndex,
    idx => {
      const ab = store.abRepeat
      if (!ab || store.playbackMode !== 'full' || !audio.isPlaying.value) {
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
    handleGoToBookmark,
    handleSeek,
    handleSetSpeed
  }
}
