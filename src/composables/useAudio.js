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
  let blobUrl = null

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
  // Seek requested before enough media is buffered; applied when safe.
  let pendingSeekMs = null

  function publishDebug(extra = {}) {
    if (typeof window === 'undefined') {
      return
    }
    window.__audioDebug = {
      src: (audio.currentSrc || audio.src || '').slice(-80),
      readyState: audio.readyState,
      networkState: audio.networkState,
      duration: audio.duration,
      currentTime: audio.currentTime,
      paused: audio.paused,
      error: audio.error ? { code: audio.error.code, message: audio.error.message } : null,
      pendingSeekMs,
      isPlaying: isPlaying.value,
      ...extra,
      at: Date.now()
    }
  }

  if (typeof window !== 'undefined') {
    window.__forceKillAudio = () => {
      dbg('forceKillAudio')
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
      audio.src = ''
      isPlaying.value = false
      progress.value = 0
      currentTimeMs.value = 0
      duration.value = 0
      pendingSeekMs = null
      publishDebug({ forceKilled: true })
    }
    window.__getAudioSnapshot = () => ({
      src: audio.currentSrc || audio.src,
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

  function snapshot(label) {
    publishDebug({ label })
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

  // Mid-file seeks need more than bare metadata. Seeking immediately after a SW
  // takeover often throws PIPELINE_ERROR_READ / demuxer errors (reproduced locally).
  function canSafelySeek() {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      return false
    }
    if (audio.error) {
      return false
    }
    // HAVE_FUTURE_DATA (3) or HAVE_ENOUGH_DATA (4).
    return audio.readyState >= 3
  }

  function applyPendingSeek() {
    if (pendingSeekMs == null) {
      return false
    }
    if (!canSafelySeek()) {
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

  function revokeBlobUrl() {
    if (blobUrl) {
      try {
        URL.revokeObjectURL(blobUrl)
      } catch {
        // ignore
      }
      blobUrl = null
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
      // Buffer growth can make a pending mid-file seek safe.
      applyPendingSeek()
    })

    el.addEventListener('loadedmetadata', () => {
      dbg('loadedmetadata', { duration: el.duration })
      syncProgressFromElement()
      // Do NOT seek here for mid-file positions — wait for canplay/progress.
    })

    el.addEventListener('canplay', () => {
      dbg('canplay', { readyState: el.readyState })
      applyPendingSeek()
    })

    el.addEventListener('canplaythrough', () => {
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
      applyPendingSeek()
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
    revokeBlobUrl()
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
    // Blob recovery URLs are not equal to the original CDN url.
    if (current.startsWith('blob:')) {
      return false
    }
    return current === resolveUrl(url)
  }

  function isElementHealthy() {
    return !audio.error && audio.networkState !== HTMLMediaElement.NETWORK_NO_SOURCE
  }

  function load(url) {
    if (!url) {
      return
    }
    if (hasLoadedUrl(url) && isElementHealthy() && audio.readyState >= 1) {
      dbg('load skip (already loaded)', url.slice(-40))
      return
    }
    // Preserve a pending seek across reloads of the same logical source only when
    // the caller has already set pendingSeekMs for this play.
    dbg('load', url.slice(-60))
    revokeBlobUrl()
    audio.src = url
    audio.load()
  }

  /**
   * After a service-worker update, CacheFirst audio can leave the media pipeline
   * unable to demux the same URL. Fetch a fresh copy (network-first via no-store
   * where possible) and play from a blob: URL that the SW does not intercept as
   * a range-request audio route.
   */
  async function loadViaBlob(url) {
    dbg('loadViaBlob', url.slice(-60))
    recreateAudio()
    try {
      const res = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        // Prefer a real network response; SW may still intercept, but many
        // implementations revalidate on reload/no-store.
        cache: 'reload'
      })
      if (!res.ok) {
        throw new Error(`blob fetch ${res.status}`)
      }
      const blob = await res.blob()
      revokeBlobUrl()
      blobUrl = URL.createObjectURL(blob)
      audio.src = blobUrl
      audio.load()
      return true
    } catch (e) {
      dbg('loadViaBlob failed, fallback to direct', e && (e.message || e))
      // Cache-bust query to miss a stale SW runtime cache entry.
      const bust = url.includes('?') ? `&_swb=${Date.now()}` : `?_swb=${Date.now()}`
      audio.src = url + bust
      audio.load()
      return false
    }
  }

  async function playFromElement() {
    audio.playbackRate = playbackRate.value
    audio.volume = volume.value
    snapshot('playFromElement before')
    try {
      await audio.play()
      // If play "succeeded" but an error is already latched (or arrives immediately),
      // treat it as failure so recovery can run.
      if (audio.error) {
        dbg('playFromElement ok but error present')
        isPlaying.value = false
        return false
      }
      snapshot('playFromElement ok')
      return true
    } catch (e) {
      dbg('playFromElement failed', e && (e.name || e.message || e))
      isPlaying.value = false
      return false
    }
  }

  function waitFor(predicate, timeoutMs, events = ['loadedmetadata', 'canplay', 'canplaythrough', 'progress', 'error']) {
    return new Promise(resolve => {
      if (predicate()) {
        resolve(true)
        return
      }
      let settled = false
      const done = ok => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        for (const ev of events) {
          audio.removeEventListener(ev, onEv)
        }
        resolve(ok)
      }
      const onEv = () => {
        if (audio.error) {
          done(false)
          return
        }
        if (predicate()) {
          done(true)
        }
      }
      const timer = setTimeout(() => done(predicate()), timeoutMs)
      for (const ev of events) {
        audio.addEventListener(ev, onEv)
      }
    })
  }

  /**
   * Load `url`, optionally seek to startMs, then play.
   *
   * Critical: call HTMLMediaElement.play() as early as possible inside the user
   * gesture. Awaiting network first drops transient activation (NotAllowedError).
   *
   * After PWA Update, mid-file seeks on a just-claimed SW can poison the element
   * (PIPELINE_ERROR_READ). Recovery: recreate + blob/network reload of the source.
   */
  async function playAt(url, startMs = null) {
    dbg('playAt', { url: url ? url.slice(-60) : null, startMs })
    if (!url) {
      return false
    }

    // If the current element is already poisoned (common right after SW update
    // + restore seek), start from a clean element before touching play().
    if (audio.error || !isElementHealthy()) {
      dbg('playAt: unhealthy element, recreating first')
      const seek = startMs
      recreateAudio()
      if (seek != null && Number.isFinite(seek) && seek >= 0) {
        pendingSeekMs = seek
      }
    }

    load(url)

    if (startMs != null && Number.isFinite(startMs) && startMs >= 0) {
      pendingSeekMs = startMs
      applyPendingSeek()
    }

    // First attempt: play immediately (keeps user-gesture activation).
    if (await playFromElement()) {
      applyPendingSeek()
      // Brief settle: if demuxer errors right after play, recover below.
      await new Promise(r => setTimeout(r, 120))
      if (!audio.error && !audio.paused) {
        return true
      }
      dbg('playAt: died right after first play', audio.error)
    }

    // Immediate recovery path — do not wait multi-seconds on a dead element.
    const retrySeek = startMs
    recreateAudio()
    load(url)
    if (retrySeek != null && Number.isFinite(retrySeek) && retrySeek >= 0) {
      pendingSeekMs = retrySeek
    }
    await waitFor(() => audio.readyState >= 1 && !audio.error, 2500)
    applyPendingSeek()
    if (await playFromElement()) {
      await new Promise(r => setTimeout(r, 120))
      if (!audio.error && !audio.paused) {
        return true
      }
    }

    // Last resort: bypass broken SW audio cache via blob / cache-bust.
    await loadViaBlob(url)
    if (retrySeek != null && Number.isFinite(retrySeek) && retrySeek >= 0) {
      pendingSeekMs = retrySeek
    }
    await waitFor(() => canSafelySeek() || (audio.readyState >= 1 && !audio.error), 5000)
    applyPendingSeek()
    if (await playFromElement()) {
      applyPendingSeek()
      return !audio.error
    }
    return false
  }

  async function loadAndPlay(url) {
    return playAt(url, null)
  }

  async function play(url) {
    if (url) {
      return playAt(url, null)
    }
    const existing = audio.currentSrc || audio.src
    if (!existing || existing.startsWith('blob:')) {
      dbg('play() no durable source')
      return false
    }
    if (!audio.error && (await playFromElement())) {
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

  // Queue mid-file seeks until the element can safely demux at that offset.
  function seekTo(ms) {
    if (!Number.isFinite(ms) || ms < 0) {
      return
    }
    pendingSeekMs = ms
    currentTimeMs.value = ms
    verseSeekUntil = Date.now() + 600
    if (canSafelySeek()) {
      applyPendingSeek()
    } else {
      dbg('seekTo queued until buffered', ms)
    }
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
    revokeBlobUrl()
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
