import { watch } from 'vue'

// Lock screen / notification playback controls via the Media Session API.
export function useMediaSession(store, handlers, audio = null) {
  let lastPositionWrite = 0

  function updateMetadata() {
    if (!('mediaSession' in navigator)) {
      return
    }
    const surah = store.currentSurah
    const verse = store.currentVerse
    if (!surah) {
      return
    }

    const artwork = [
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]

    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${surah.englishName} - Verse ${verse?.number || 1}`,
      artist: store.currentReciterData?.name || 'Quran Player',
      album: surah.englishNameTranslation,
      artwork
    })
  }

  function bindActionHandlers() {
    if (!('mediaSession' in navigator)) {
      return
    }

    const play = handlers.play || handlers.togglePlay
    const pause = handlers.pause || handlers.togglePlay

    navigator.mediaSession.setActionHandler('play', () => {
      if (typeof play === 'function') {
        play()
      }
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      if (typeof pause === 'function') {
        pause()
      }
    })
    // At a surah boundary the verse buttons have nowhere to go; fall through to
    // the adjacent surah so lock-screen prev/next never turn into dead buttons.
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (store.canPrevVerse) {
        handlers.prevVerse()
      } else if (store.canPrevSurah && typeof handlers.prevSurah === 'function') {
        handlers.prevSurah()
      }
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (store.canNextVerse) {
        handlers.nextVerse()
      } else if (store.canNextSurah && typeof handlers.nextSurah === 'function') {
        handlers.nextSurah()
      }
    })
  }

  function updatePlaybackState() {
    if (!('mediaSession' in navigator) || !audio) {
      return
    }
    try {
      navigator.mediaSession.playbackState = audio.isPlaying.value ? 'playing' : 'paused'
    } catch {
      // Older browsers may reject unknown states.
    }
  }

  function updatePositionState() {
    if (!('mediaSession' in navigator) || !audio) {
      return
    }
    if (typeof navigator.mediaSession.setPositionState !== 'function') {
      return
    }
    const duration = (audio.duration?.value || 0) / 1000
    const position = Math.max(0, (audio.currentTimeMs?.value || 0) / 1000)
    if (!Number.isFinite(duration) || duration <= 0) {
      return
    }
    const now = Date.now()
    // Throttle lock-screen position updates.
    if (now - lastPositionWrite < 1000 && position > 0.25) {
      return
    }
    lastPositionWrite = now
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audio.playbackRate?.value || 1,
        position: Math.min(position, duration)
      })
    } catch {
      // Ignore invalid state (e.g. position > duration during seek).
    }
  }

  function update() {
    updateMetadata()
    bindActionHandlers()
    updatePlaybackState()
    updatePositionState()
  }

  watch(
    () => [store.currentSurahNum, store.currentVerseIndex, store.currentReciter],
    () => update()
  )

  if (audio) {
    watch(
      () => audio.isPlaying?.value,
      () => {
        updatePlaybackState()
        updatePositionState()
      }
    )
    watch(
      () => audio.currentTimeMs?.value,
      () => updatePositionState()
    )
  }

  return { update }
}
