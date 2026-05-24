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

  // -- Controls --
  function togglePlay() {
    if (audio.isPlaying.value) {
      audio.pause()
      return
    }
    if (store.playbackMode === 'full' && store.audioUrl) {
      audio.play()
    } else if (store.playbackMode === 'verse' && store.audioUrls.length) {
      audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
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

  function handleVerseSelect(index) {
    store.setVerse(index)
    if (store.playbackMode === 'full') {
      const timing = store.verseTimings[index]
      if (timing) {
        audio.seekTo(timing.timestampFrom)
        if (!audio.isPlaying.value) {
          audio.play()
        }
      }
    } else {
      audio.loadAndPlay(store.audioUrls[index])
      preloadAhead()
    }
  }

  function handleJumpToVerse(index) {
    store.setVerse(index)
    const wasPlaying = audio.isPlaying.value
    if (store.playbackMode === 'full') {
      const timing = store.verseTimings[index]
      if (timing) {
        audio.seekTo(timing.timestampFrom)
        if (wasPlaying) {
          audio.play()
        }
      }
    } else if (store.audioUrls.length) {
      if (wasPlaying) {
        audio.loadAndPlay(store.audioUrls[index])
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
    if (store.repeatMode === 'verse') {
      if (store.playbackMode === 'full') {
        const timing = store.verseTimings[store.currentVerseIndex]
        if (timing) {
          audio.seekTo(timing.timestampFrom)
          audio.play()
        }
      } else {
        audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
      }
      return
    }

    if (store.repeatMode === 'surah') {
      store.currentVerseIndex = 0
      store.currentWordIndex = -1
      if (store.playbackMode === 'full') {
        audio.seekTo(0)
        audio.play()
      } else if (store.audioUrls.length) {
        audio.loadAndPlay(store.audioUrls[0])
        preloadAhead()
      }
      return
    }

    if (store.playbackMode === 'verse' && store.canNextVerse) {
      store.nextVerse()
      audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
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
          audio.loadAndPlay(url)
        } else {
          audio.load(url)
        }
      }
    }
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

  onBeforeUnmount(clearPreload)

  return {
    continuingPlayback,
    preloadAhead,
    togglePlay,
    handlePrevVerse,
    handleNextVerse,
    handlePrevSurah,
    handleNextSurah,
    handleVerseSelect,
    handleJumpToVerse,
    handleGoToBookmark,
    handleSeek,
    handleSetSpeed
  }
}
