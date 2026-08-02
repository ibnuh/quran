import { ref, onBeforeUnmount } from 'vue'

// Enable with localStorage.quran-debug-audio = '1' or ?debugAudio=1
const DEBUG_AUDIO =
  typeof window !== 'undefined' &&
  (window.localStorage?.getItem('quran-debug-audio') === '1' ||
    /(?:\?|&)debugAudio=1(?:&|$)/.test(window.location.search || ''))
function dbg(...args) {
  if (DEBUG_AUDIO) {
    console.info('[audio]', ...args)
  }
}

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

  function snapshot(label) {
    if (!DEBUG_AUDIO) {
      return
    }
    dbg(label, {
      src: (audio.currentSrc || audio.src || '').slice(-60),
      readyState: audio.readyState,
      networkState: audio.networkState,
      duration: audio.duration,
      currentTime: audio.currentTime,
      paused: audio.paused,
      error: audio.error ? { code: audio.error.code, message: audio.error.message } : null,
      pendingSeekMs,
      isPlaying: isPlaying.value
    })
  }

  function syncProgressFromElement() {
    currentTimeMs.value = audio.currentTime * 1000
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      progress.value = (audio.currentTime / audio.duration) * 100
      duration.value = audio.duration * 1000
    }
  }

  function applyPendingSeek() {
    if (pendingSeekMs == null) {
      return false
    }
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      return false
    }
    const sec = Math.max(0, Math.min(pendingSeekMs / 1000, Math.max(0, audio.duration - 0.05)))
    try {
      audio.currentTime = sec
      currentTimeMs.value = sec * 1000
      verseSeekUntil = Date.now() + 600
      pendingSeekMs = null
      dbg('seek applied', { sec })
      return true
    } catch (e) {
      dbg('seek failed', e)
      return false
    }
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
      dbg('loadedmetadata', { duration: el.duration })
      syncProgressFromElement()
      applyPendingSeek()
    })

    el.addEventListener('canplay', () => {
      dbg('canplay', { readyState: el.readyState })
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
      dbg('play event')
    })

    el.addEventListener('playing', () => {
      dbg('playing event', { currentTime: el.currentTime })
    })

    el.addEventListener('pause', () => {
      isPlaying.value = false
      dbg('pause event')
    })

    el.addEventListener('error', () => {
      isPlaying.value = false
      snapshot('error event')
    })
  }

  bindAudioEvents(audio)

  // Replace the media element entirely. Needed when a service-worker update leaves
  // the old pipeline in a dead state where play() rejects forever on the same node.
  function recreateAudio() {
    dbg('recreateAudio')
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

  function load(url) {
    if (!url) {
      return
    }
    // Avoid resetting a healthy element to the same source (would interrupt playback).
    if (hasLoadedUrl(url) && !audio.error && audio.readyState >= 1) {
      dbg('load skip (already loaded)', url.slice(-40))
      return
    }
    pendingSeekMs = null
    dbg('load', url.slice(-60))
    audio.src = url
    audio.load()
  }

  async function playFromElement() {
    audio.playbackRate = playbackRate.value
    audio.volume = volume.value
    snapshot('playFromElement before')
    try {
      // IMPORTANT: call play() without awaiting prior network waits when possible.
      // Browsers only honor autoplay when play() is invoked inside a user gesture.
      await audio.play()
      snapshot('playFromElement ok')
      return true
    } catch (e) {
      dbg('playFromElement failed', e && (e.name || e.message || e))
      return false
    }
  }

  /**
   * Load `url`, optionally seek to startMs, then play.
   *
   * Critical: call HTMLMediaElement.play() as early as possible inside the user
   * gesture. Awaiting network/metadata first drops the transient activation and
   * browsers then reject play() with NotAllowedError — which looked like a dead button.
   */
  async function playAt(url, startMs = null) {
    dbg('playAt', { url: url ? url.slice(-60) : null, startMs })
    if (!url) {
      return false
    }

    load(url)

    if (startMs != null && Number.isFinite(startMs) && startMs >= 0) {
      pendingSeekMs = startMs
      applyPendingSeek()
    }

    // First attempt: play immediately (keeps user-gesture activation).
    if (await playFromElement()) {
      // Seek may still be pending if metadata arrived mid-play; apply now.
      applyPendingSeek()
      return true
    }

    // Second attempt: wait briefly for metadata, seek, play again.
    // (May still fail if the browser already consumed the gesture.)
    await new Promise(resolve => {
      if (audio.readyState >= 1 && Number.isFinite(audio.duration) && audio.duration > 0) {
        resolve()
        return
      }
      const done = () => {
        audio.removeEventListener('loadedmetadata', done)
        audio.removeEventListener('canplay', done)
        audio.removeEventListener('error', done)
        clearTimeout(timer)
        resolve()
      }
      const timer = setTimeout(done, 4000)
      audio.addEventListener('loadedmetadata', done, { once: true })
      audio.addEventListener('canplay', done, { once: true })
      audio.addEventListener('error', done, { once: true })
    })
    applyPendingSeek()

    if (await playFromElement()) {
      return true
    }

    // Last resort: brand-new element (dead pipeline after SW update).
    const retrySeek = startMs
    recreateAudio()
    load(url)
    if (retrySeek != null && Number.isFinite(retrySeek) && retrySeek >= 0) {
      pendingSeekMs = retrySeek
    }
    await new Promise(resolve => {
      const done = () => {
        audio.removeEventListener('loadedmetadata', done)
        audio.removeEventListener('canplay', done)
        audio.removeEventListener('error', done)
        clearTimeout(timer)
        resolve()
      }
      const timer = setTimeout(done, 4000)
      audio.addEventListener('loadedmetadata', done, { once: true })
      audio.addEventListener('canplay', done, { once: true })
      audio.addEventListener('error', done, { once: true })
    })
    applyPendingSeek()
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
      dbg('play() no source')
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
      dbg('seekTo queued', ms)
      return
    }
    const sec = Math.max(0, Math.min(ms / 1000, Math.max(0, audio.duration - 0.05)))
    audio.currentTime = sec
    currentTimeMs.value = sec * 1000
    verseSeekUntil = Date.now() + 600
    pendingSeekMs = null
    dbg('seekTo immediate', sec)
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
