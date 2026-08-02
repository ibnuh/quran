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
  // Seek requested before metadata was ready; applied on loadedmetadata.
  let pendingSeekMs = null

  function syncProgressFromElement() {
    currentTimeMs.value = audio.currentTime * 1000
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      progress.value = (audio.currentTime / audio.duration) * 100
      duration.value = audio.duration * 1000
    }
  }

  function applyPendingSeek() {
    if (pendingSeekMs == null) {
      return
    }
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      return
    }
    const sec = Math.max(0, Math.min(pendingSeekMs / 1000, Math.max(0, audio.duration - 0.05)))
    audio.currentTime = sec
    currentTimeMs.value = sec * 1000
    verseSeekUntil = Date.now() + 600
    pendingSeekMs = null
  }

  function bindAudioEvents(el) {
    el.addEventListener('timeupdate', () => {
      syncProgressFromElement()
      if (onTimeUpdateCb) {
        onTimeUpdateCb(currentTimeMs.value)
      }
    })

    el.addEventListener('progress', () => {
      if (el.buffered.length > 0 && el.duration) {
        buffered.value = (el.buffered.end(el.buffered.length - 1) / el.duration) * 100
      }
    })

    el.addEventListener('loadedmetadata', () => {
      syncProgressFromElement()
      applyPendingSeek()
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

  function waitForReady(timeoutMs = 10000) {
    return new Promise(resolve => {
      // HAVE_FUTURE_DATA or better is ideal; HAVE_METADATA is enough to seek.
      if (audio.readyState >= 1 && Number.isFinite(audio.duration) && audio.duration > 0) {
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
        audio.removeEventListener('loadedmetadata', onReady)
        audio.removeEventListener('canplay', onReady)
        audio.removeEventListener('error', onError)
        resolve(ok)
      }
      const onReady = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          finish(true)
        }
      }
      const onError = () => finish(false)
      const timer = setTimeout(() => {
        finish(audio.readyState >= 1 && Number.isFinite(audio.duration) && audio.duration > 0)
      }, timeoutMs)
      audio.addEventListener('loadedmetadata', onReady)
      audio.addEventListener('canplay', onReady)
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
    pendingSeekMs = null
    audio.src = url
    audio.load()
  }

  async function ensureLoaded(url) {
    if (!url) {
      return false
    }
    load(url)
    if (await waitForReady()) {
      return true
    }
    // Hard reload once.
    audio.removeAttribute('src')
    audio.load()
    audio.src = url
    audio.load()
    return waitForReady()
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

  /**
   * Load `url`, optionally seek to startMs (after metadata is ready), then play.
   * startMs is required when resuming from a specific ayah in full-surah mode.
   */
  async function playAt(url, startMs = null) {
    if (!url) {
      return false
    }

    let ready = await ensureLoaded(url)
    if (!ready) {
      recreateAudio()
      ready = await ensureLoaded(url)
      if (!ready) {
        return false
      }
    }

    if (startMs != null && Number.isFinite(startMs) && startMs >= 0) {
      pendingSeekMs = startMs
      applyPendingSeek()
      // If metadata still wasn't ready somehow, wait once more.
      if (pendingSeekMs != null) {
        await waitForReady(3000)
        applyPendingSeek()
      }
    }

    if (await playFromElement()) {
      return true
    }

    // Dead media element after SW update: recreate and try once more.
    const retrySeek = startMs
    recreateAudio()
    ready = await ensureLoaded(url)
    if (!ready) {
      return false
    }
    if (retrySeek != null && Number.isFinite(retrySeek) && retrySeek >= 0) {
      pendingSeekMs = retrySeek
      applyPendingSeek()
    }
    return playFromElement()
  }

  // Ensure the element has `url`, then play from the current position.
  async function loadAndPlay(url) {
    return playAt(url, null)
  }

  // Resume current source, or load `url` first when the element has no usable media.
  async function play(url) {
    if (url) {
      return playAt(url, null)
    }
    const existing = audio.currentSrc || audio.src
    if (!existing) {
      return false
    }
    if (await playFromElement()) {
      return true
    }
    return playAt(existing, currentTimeMs.value || null)
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
    pendingSeekMs = null
  }

  // Seeks to an exact verse boundary. If metadata is not ready yet, queues the seek
  // until loadedmetadata. Never apply a seek past the known duration.
  function seekTo(ms) {
    if (!Number.isFinite(ms) || ms < 0) {
      return
    }
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      pendingSeekMs = ms
      currentTimeMs.value = ms
      verseSeekUntil = Date.now() + 600
      return
    }
    const sec = Math.max(0, Math.min(ms / 1000, Math.max(0, audio.duration - 0.05)))
    audio.currentTime = sec
    currentTimeMs.value = sec * 1000
    verseSeekUntil = Date.now() + 600
    pendingSeekMs = null
  }

  function isVerseSeekActive() {
    return Date.now() < verseSeekUntil
  }

  function seek(ratio) {
    if (audio.duration) {
      audio.currentTime = ratio * audio.duration
      syncProgressFromElement()
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
    playAt,
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
