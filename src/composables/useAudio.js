import { ref, onBeforeUnmount } from 'vue'

export function useAudio() {
  let audio = new Audio()
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
  let verseSeekUntil = 0

  function bindAudioEvents(el) {
    el.addEventListener('timeupdate', () => {
      currentTimeMs.value = el.currentTime * 1000
      if (el.duration) {
        progress.value = (el.currentTime / el.duration) * 100
        duration.value = el.duration * 1000
      }
      if (onTimeUpdateCb) {
        onTimeUpdateCb(currentTimeMs.value)
      }
    })

    el.addEventListener('progress', () => {
      if (el.buffered.length > 0 && el.duration) {
        buffered.value = (el.buffered.end(el.buffered.length - 1) / el.duration) * 100
      }
    })

    el.addEventListener('ended', () => {
      isPlaying.value = false
      progress.value = 0
      currentTimeMs.value = 0
      if (onEndedCb) {
        onEndedCb()
      }
    })

    el.addEventListener('play', () => {
      isPlaying.value = true
    })

    el.addEventListener('pause', () => {
      isPlaying.value = false
    })

    el.addEventListener('error', () => {
      isPlaying.value = false
    })
  }

  bindAudioEvents(audio)

  // Replace the media element entirely. Needed when a service-worker update leaves
  // the old pipeline in a dead state where play() rejects forever on the same node.
  function recreateAudio() {
    try {
      audio.pause()
    } catch {
      // ignore
    }
    audio.removeAttribute('src')
    try {
      audio.load()
    } catch {
      // ignore
    }
    audio = new Audio()
    audio.preload = 'auto'
    audio.playbackRate = playbackRate.value
    audio.volume = volume.value
    bindAudioEvents(audio)
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

  function waitForCanPlay(timeoutMs = 6000) {
    return new Promise(resolve => {
      // HAVE_CURRENT_DATA or better.
      if (audio.readyState >= 2) {
        resolve(true)
        return
      }
      let settled = false
      const finish = ok => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        audio.removeEventListener('canplay', onReady)
        audio.removeEventListener('loadeddata', onReady)
        audio.removeEventListener('error', onError)
        resolve(ok)
      }
      const onReady = () => finish(true)
      const onError = () => finish(false)
      const timer = setTimeout(() => finish(audio.readyState >= 1), timeoutMs)
      audio.addEventListener('canplay', onReady, { once: true })
      audio.addEventListener('loadeddata', onReady, { once: true })
      audio.addEventListener('error', onError, { once: true })
    })
  }

  function load(url) {
    if (!url) {
      return
    }
    // Avoid resetting a healthy element to the same source (would interrupt playback).
    if (hasLoadedUrl(url) && !audio.error && audio.readyState >= 1) {
      return
    }
    audio.src = url
    audio.load()
  }

  async function playFromElement() {
    audio.playbackRate = playbackRate.value
    audio.volume = volume.value
    try {
      await audio.play()
      return true
    } catch {
      return false
    }
  }

  async function attemptPlay(url) {
    if (!url) {
      return false
    }
    load(url)
    await waitForCanPlay()
    if (await playFromElement()) {
      return true
    }
    // Same element, hard reload of the source.
    audio.removeAttribute('src')
    audio.load()
    audio.src = url
    audio.load()
    await waitForCanPlay()
    return playFromElement()
  }

  // Ensure the element has `url`, then play. Recreates the media element once if the
  // existing pipeline is dead (common after a service-worker takeover).
  async function loadAndPlay(url) {
    if (!url) {
      return false
    }
    if (await attemptPlay(url)) {
      return true
    }
    recreateAudio()
    return attemptPlay(url)
  }

  // Resume current source, or load `url` first when the element has no usable media.
  async function play(url) {
    if (url) {
      return loadAndPlay(url)
    }
    const existing = audio.currentSrc || audio.src
    if (!existing) {
      return false
    }
    if (await playFromElement()) {
      return true
    }
    return loadAndPlay(existing)
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

  // Direct read of audio.currentTime for RAF polling (no event delay)
  function getLiveTimeMs() {
    return audio.currentTime * 1000
  }

  function onTimeUpdate(cb) {
    onTimeUpdateCb = cb
  }
  function onEnded(cb) {
    onEndedCb = cb
  }

  onBeforeUnmount(() => {
    try {
      audio.pause()
    } catch {
      // ignore
    }
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
