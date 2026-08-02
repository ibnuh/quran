import { ref, onBeforeUnmount } from 'vue'

export function useAudio() {
  const audio = new Audio()
  audio.preload = 'auto'
  const isPlaying = ref(false)
  const progress = ref(0)
  const currentTimeMs = ref(0)
  const duration = ref(0)
  const buffered = ref(0)
  const playbackRate = ref(1)
  const volume = ref(1)

  let onTimeUpdateCb = null
  let onEndedCb = null

  audio.addEventListener('timeupdate', () => {
    currentTimeMs.value = audio.currentTime * 1000
    if (audio.duration) {
      progress.value = (audio.currentTime / audio.duration) * 100
      duration.value = audio.duration * 1000
    }
    if (onTimeUpdateCb) {
      onTimeUpdateCb(currentTimeMs.value)
    }
  })

  audio.addEventListener('progress', () => {
    if (audio.buffered.length > 0 && audio.duration) {
      buffered.value = (audio.buffered.end(audio.buffered.length - 1) / audio.duration) * 100
    }
  })

  audio.addEventListener('ended', () => {
    isPlaying.value = false
    progress.value = 0
    currentTimeMs.value = 0
    if (onEndedCb) {
      onEndedCb()
    }
  })

  audio.addEventListener('play', () => {
    isPlaying.value = true
  })

  audio.addEventListener('pause', () => {
    isPlaying.value = false
  })

  audio.addEventListener('error', () => {
    isPlaying.value = false
  })

  // Direct read of audio.currentTime for RAF polling (no event delay)
  function getLiveTimeMs() {
    return audio.currentTime * 1000
  }

  function resolveUrl(url) {
    if (!url) {
      return ''
    }
    try {
      return new URL(url, window.location.href).href
    } catch {
      return url
    }
  }

  function hasLoadedUrl(url) {
    if (!url) {
      return false
    }
    const current = audio.currentSrc || audio.src || ''
    if (!current) {
      return false
    }
    return current === resolveUrl(url)
  }

  function load(url) {
    if (!url) {
      return
    }
    // Avoid resetting a healthy element to the same source (would interrupt playback).
    if (hasLoadedUrl(url) && !audio.error) {
      return
    }
    audio.src = url
    audio.load()
  }

  async function playFromElement() {
    audio.playbackRate = playbackRate.value
    try {
      await audio.play()
      return true
    } catch {
      return false
    }
  }

  // Ensure the element has `url`, then play. Retries once after a hard reload of the
  // source: after a service-worker update the previous media pipeline can be dead
  // (play() resolves to nothing / rejects), even when store.audioUrl is still set.
  async function loadAndPlay(url) {
    if (!url) {
      return false
    }
    load(url)
    if (await playFromElement()) {
      return true
    }
    // Hard retry: clear + reload the same URL (common after SW controllerchange).
    audio.removeAttribute('src')
    audio.load()
    audio.src = url
    audio.load()
    return playFromElement()
  }

  // Resume current source, or load `url` first when the element has no usable media.
  async function play(url) {
    if (url) {
      return loadAndPlay(url)
    }
    if (!audio.src && !audio.currentSrc) {
      return false
    }
    if (await playFromElement()) {
      return true
    }
    // Element has a source but play failed: force a reload of the same source.
    const retryUrl = audio.currentSrc || audio.src
    if (!retryUrl) {
      return false
    }
    return loadAndPlay(retryUrl)
  }

  function pause() {
    audio.pause()
  }

  function stop() {
    audio.pause()
    audio.currentTime = 0
    progress.value = 0
    currentTimeMs.value = 0
    buffered.value = 0
  }

  // Seeks to an exact verse boundary. MP3 seeking snaps to a frame, so the audio
  // can land a few ms before the target; mark a short window during which the
  // timing-based verse recompute is suppressed so it does not undo a manual
  // verse navigation (scrub-bar seeks use seek() and are not marked).
  let verseSeekUntil = 0
  function seekTo(ms) {
    audio.currentTime = ms / 1000
    currentTimeMs.value = ms
    verseSeekUntil = Date.now() + 600
  }

  function isVerseSeekActive() {
    return Date.now() < verseSeekUntil
  }

  function seek(ratio) {
    if (audio.duration) {
      audio.currentTime = ratio * audio.duration
    }
  }

  function setPlaybackRate(rate) {
    playbackRate.value = rate
    audio.playbackRate = rate
  }

  function setVolume(value) {
    const v = Math.max(0, Math.min(1, value))
    volume.value = v
    audio.volume = v
  }

  function onTimeUpdate(cb) {
    onTimeUpdateCb = cb
  }
  function onEnded(cb) {
    onEndedCb = cb
  }

  onBeforeUnmount(() => {
    audio.pause()
    audio.src = ''
  })

  return {
    isPlaying,
    progress,
    currentTimeMs,
    duration,
    buffered,
    playbackRate,
    volume,
    load,
    loadAndPlay,
    play,
    pause,
    stop,
    seekTo,
    seek,
    isVerseSeekActive,
    setPlaybackRate,
    setVolume,
    getLiveTimeMs,
    onTimeUpdate,
    onEnded
  }
}
