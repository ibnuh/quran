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
  const isLoading = ref(false)
  const isSeeking = ref(false)
  const progress = ref(0)
  const currentTimeMs = ref(0)
  const duration = ref(0)
  const buffered = ref(0)
  const playbackRate = ref(1)
  const volume = ref(1)
  const playFailed = ref(false)
  const lastError = ref(null)

  let onTimeUpdateCb = null
  let onEndedCb = null
  let verseSeekUntil = 0
  // Seek requested before enough media is buffered; applied when safe.
  let pendingSeekMs = null
  let activeSeekTargetMs = null
  let seekSettleTimer = null
  let loadTimeoutTimer = null
  let playIntentId = 0
  // Temporarily mute while a mid-file seek is pending so t=0 never audibly flashes.
  let muteUntilSeek = false
  const MUTE_SEEK_THRESHOLD_MS = 250
  const LOAD_TIMEOUT_MS = 20000

  function nextPlayIntent() {
    playIntentId += 1
    return playIntentId
  }

  function cancelPendingPlay() {
    playIntentId += 1
  }

  function isCurrentPlayIntent(intent) {
    return intent === playIntentId
  }

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
      activeSeekTargetMs,
      isPlaying: isPlaying.value,
      isLoading: isLoading.value,
      isSeeking: isSeeking.value,
      ...extra,
      at: Date.now()
    }
  }

  if (typeof window !== 'undefined') {
    window.__forceKillAudio = () => {
      dbg('forceKillAudio')
      cancelPendingPlay()
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
      isLoading.value = false
      progress.value = 0
      currentTimeMs.value = 0
      duration.value = 0
      clearSeekState()
      clearLoadTimeout()
      clearPlayFailed()
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
      activeSeekTargetMs,
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
      activeSeekTargetMs,
      isPlaying: isPlaying.value
    })
  }

  function syncProgressFromTarget(targetMs) {
    currentTimeMs.value = targetMs
    if (duration.value > 0) {
      progress.value = (targetMs / duration.value) * 100
    }
  }

  function syncProgressFromElement() {
    if (activeSeekTargetMs != null) {
      syncProgressFromTarget(activeSeekTargetMs)
      return
    }
    currentTimeMs.value = audio.currentTime * 1000
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      progress.value = (audio.currentTime / audio.duration) * 100
      duration.value = audio.duration * 1000
    }
  }

  function setExpectedDuration(ms) {
    const expected = Number(ms)
    duration.value = Number.isFinite(expected) && expected > 0 ? expected : 0
    if (activeSeekTargetMs != null) {
      syncProgressFromTarget(activeSeekTargetMs)
    }
  }

  function clearSeekSettleTimer() {
    clearTimeout(seekSettleTimer)
    seekSettleTimer = null
  }

  function clearLoadTimeout() {
    clearTimeout(loadTimeoutTimer)
    loadTimeoutTimer = null
  }

  function armLoadTimeout() {
    clearLoadTimeout()
    loadTimeoutTimer = setTimeout(() => {
      if (!isLoading.value && pendingSeekMs == null && activeSeekTargetMs == null) {
        return
      }
      dbg('load timeout')
      markPlayFailed('timeout')
      isLoading.value = false
      isSeeking.value = false
      clearSeekState()
      try {
        audio.pause()
      } catch {
        // ignore
      }
      isPlaying.value = false
    }, LOAD_TIMEOUT_MS)
  }

  function clearSeekState() {
    pendingSeekMs = null
    activeSeekTargetMs = null
    isSeeking.value = false
    clearSeekSettleTimer()
    releaseMuteUntilSeek()
  }

  function applyElementVolume() {
    audio.volume = muteUntilSeek ? 0 : volume.value
  }

  function beginMuteUntilSeek() {
    muteUntilSeek = true
    audio.volume = 0
  }

  function releaseMuteUntilSeek() {
    if (!muteUntilSeek) {
      return
    }
    muteUntilSeek = false
    applyElementVolume()
  }

  function markPlayFailed(reason = 'error') {
    playFailed.value = true
    lastError.value = reason
  }

  function clearPlayFailed() {
    playFailed.value = false
    lastError.value = null
  }

  function settleSeekIfAtTarget(force = false) {
    if (pendingSeekMs != null || activeSeekTargetMs == null) {
      return false
    }
    const liveMs = audio.currentTime * 1000
    if (!force && Math.abs(liveMs - activeSeekTargetMs) > 750) {
      return false
    }
    activeSeekTargetMs = null
    isSeeking.value = false
    verseSeekUntil = Date.now() + 600
    clearSeekSettleTimer()
    releaseMuteUntilSeek()
    syncProgressFromElement()
    return true
  }

  function scheduleSeekSettleFallback() {
    clearSeekSettleTimer()
    seekSettleTimer = setTimeout(() => settleSeekIfAtTarget(true), 10000)
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
      const moved = Math.abs(audio.currentTime - sec) > 0.05
      isSeeking.value = moved
      activeSeekTargetMs = sec * 1000
      audio.currentTime = sec
      currentTimeMs.value = sec * 1000
      verseSeekUntil = Date.now() + 600
      pendingSeekMs = null
      if (moved) {
        scheduleSeekSettleFallback()
      } else {
        settleSeekIfAtTarget(true)
      }
      // If we already landed at the target (no move), mute was released in settle.
      // Otherwise keep muted until seeked/settled.
      if (!moved || activeSeekTargetMs == null) {
        releaseMuteUntilSeek()
      }
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
      if (el !== audio) {
        return
      }
      settleSeekIfAtTarget()
      syncProgressFromElement()
      if (onTimeUpdateCb) {
        onTimeUpdateCb(currentTimeMs.value)
      }
    })

    el.addEventListener('progress', () => {
      if (el !== audio) {
        return
      }
      if (el.buffered.length > 0 && el.duration) {
        buffered.value = (el.buffered.end(el.buffered.length - 1) / el.duration) * 100
      }
      // Buffer growth can make a pending mid-file seek safe.
      applyPendingSeek()
    })

    el.addEventListener('loadedmetadata', () => {
      if (el !== audio) {
        return
      }
      dbg('loadedmetadata', { duration: el.duration })
      syncProgressFromElement()
      // Do NOT seek here for mid-file positions — wait for canplay/progress.
    })

    el.addEventListener('canplay', () => {
      if (el !== audio) {
        return
      }
      dbg('canplay', { readyState: el.readyState })
      applyPendingSeek()
      isLoading.value = false
      clearLoadTimeout()
    })

    el.addEventListener('canplaythrough', () => {
      if (el !== audio) {
        return
      }
      applyPendingSeek()
      isLoading.value = false
      clearLoadTimeout()
    })

    el.addEventListener('loadstart', () => {
      if (el === audio) {
        isLoading.value = true
        armLoadTimeout()
      }
    })

    el.addEventListener('waiting', () => {
      if (el === audio) {
        isLoading.value = true
      }
    })

    el.addEventListener('stalled', () => {
      if (el === audio) {
        isLoading.value = true
      }
    })

    el.addEventListener('seeking', () => {
      if (el === audio) {
        isSeeking.value = true
      }
    })

    el.addEventListener('seeked', () => {
      if (el === audio) {
        settleSeekIfAtTarget()
      }
    })

    el.addEventListener('ended', () => {
      if (el !== audio) {
        return
      }
      isPlaying.value = false
      isLoading.value = false
      clearSeekState()
      clearLoadTimeout()
      progress.value = 0
      currentTimeMs.value = 0
      if (onEndedCb) {
        onEndedCb()
      }
    })

    el.addEventListener('play', () => {
      if (el !== audio) {
        return
      }
      isPlaying.value = true
      isLoading.value = el.readyState < 3
      dbg('play event')
    })

    el.addEventListener('playing', () => {
      if (el !== audio) {
        return
      }
      dbg('playing event', { currentTime: el.currentTime })
      applyPendingSeek()
      isLoading.value = false
      clearLoadTimeout()
    })

    el.addEventListener('pause', () => {
      if (el !== audio) {
        return
      }
      isPlaying.value = false
      dbg('pause event')
    })

    el.addEventListener('error', () => {
      if (el !== audio) {
        return
      }
      isPlaying.value = false
      isLoading.value = false
      clearSeekState()
      clearLoadTimeout()
      const mediaErr = el.error
      markPlayFailed(
        mediaErr
          ? `media-${mediaErr.code}${mediaErr.message ? `:${mediaErr.message}` : ''}`
          : 'error'
      )
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
    clearLoadTimeout()
    audio = new Audio()
    audio.preload = 'auto'
    audio.playbackRate = playbackRate.value
    applyElementVolume()
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

  function isHealthy() {
    return isElementHealthy()
  }

  function hasMediaError() {
    return !!audio.error
  }

  function load(url) {
    if (!url) {
      return
    }
    if (hasLoadedUrl(url) && isElementHealthy() && audio.readyState >= 1) {
      dbg('load skip (already loaded)', url.slice(-40))
      isLoading.value = audio.readyState < 3
      applyPendingSeek()
      return
    }
    // Preserve a pending seek across reloads of the same logical source only when
    // the caller has already set pendingSeekMs for this play.
    dbg('load', url.slice(-60))
    isLoading.value = true
    armLoadTimeout()
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
    isLoading.value = true
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

  async function playFromElement(intent = playIntentId) {
    if (!isCurrentPlayIntent(intent)) {
      return false
    }
    audio.playbackRate = playbackRate.value
    applyElementVolume()
    if (audio.readyState < 3) {
      isLoading.value = true
    }
    snapshot('playFromElement before')
    try {
      await audio.play()
      if (!isCurrentPlayIntent(intent)) {
        return false
      }
      // If play "succeeded" but an error is already latched (or arrives immediately),
      // treat it as failure so recovery can run.
      if (audio.error) {
        dbg('playFromElement ok but error present')
        isPlaying.value = false
        isLoading.value = false
        return false
      }
      if (audio.readyState >= 3) {
        isLoading.value = false
        clearLoadTimeout()
      }
      clearPlayFailed()
      snapshot('playFromElement ok')
      return true
    } catch (e) {
      dbg('playFromElement failed', e && (e.name || e.message || e))
      isPlaying.value = false
      isLoading.value = false
      return false
    }
  }

  function waitFor(
    predicate,
    timeoutMs,
    events = ['loadedmetadata', 'canplay', 'canplaythrough', 'progress', 'error']
  ) {
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
    const intent = nextPlayIntent()
    const requestedStartMs =
      startMs != null && Number.isFinite(startMs) && startMs >= 0 ? startMs : activeSeekTargetMs
    dbg('playAt', { url: url ? url.slice(-60) : null, startMs })
    if (!url) {
      return false
    }

    clearPlayFailed()

    // Mute until a mid-file seek lands so the audible head never flashes t=0.
    const needsMute =
      requestedStartMs != null &&
      Number.isFinite(requestedStartMs) &&
      requestedStartMs > MUTE_SEEK_THRESHOLD_MS
    if (needsMute) {
      beginMuteUntilSeek()
    } else {
      releaseMuteUntilSeek()
    }

    // If the current element is already poisoned (common right after SW update
    // + restore seek), start from a clean element before touching play().
    if (audio.error || !isElementHealthy()) {
      dbg('playAt: unhealthy element, recreating first')
      recreateAudio()
      if (requestedStartMs != null) {
        queueSeek(requestedStartMs)
      }
    }

    load(url)

    if (requestedStartMs != null) {
      queueSeek(requestedStartMs)
      applyPendingSeek()
    }

    // First attempt: play immediately (keeps user-gesture activation).
    if (await playFromElement(intent)) {
      applyPendingSeek()
      // Brief settle: if demuxer errors right after play, recover below.
      await new Promise(r => setTimeout(r, 120))
      if (!isCurrentPlayIntent(intent)) {
        return false
      }
      if (!audio.error && !audio.paused) {
        return true
      }
      dbg('playAt: died right after first play', audio.error)
    }

    // Immediate recovery path — do not wait multi-seconds on a dead element.
    // A scrub made while play() was waiting must supersede the verse boundary
    // captured at startup. Recovery should always follow the newest visible target.
    const retrySeek =
      activeSeekTargetMs ??
      pendingSeekMs ??
      (currentTimeMs.value > 0 ? currentTimeMs.value : requestedStartMs)
    recreateAudio()
    if (!isCurrentPlayIntent(intent)) {
      return false
    }
    if (needsMute || (retrySeek != null && retrySeek > MUTE_SEEK_THRESHOLD_MS)) {
      beginMuteUntilSeek()
    }
    load(url)
    if (retrySeek != null && Number.isFinite(retrySeek) && retrySeek >= 0) {
      queueSeek(retrySeek)
    }
    await waitFor(() => audio.readyState >= 1 && !audio.error, 2500)
    if (!isCurrentPlayIntent(intent)) {
      return false
    }
    applyPendingSeek()
    if (await playFromElement(intent)) {
      await new Promise(r => setTimeout(r, 120))
      if (!isCurrentPlayIntent(intent)) {
        return false
      }
      if (!audio.error && !audio.paused) {
        return true
      }
    }

    // Last resort: bypass broken SW audio cache via blob / cache-bust.
    await loadViaBlob(url)
    if (!isCurrentPlayIntent(intent)) {
      return false
    }
    if (needsMute || (retrySeek != null && retrySeek > MUTE_SEEK_THRESHOLD_MS)) {
      beginMuteUntilSeek()
    }
    if (retrySeek != null && Number.isFinite(retrySeek) && retrySeek >= 0) {
      queueSeek(retrySeek)
    }
    await waitFor(() => canSafelySeek() || (audio.readyState >= 1 && !audio.error), 5000)
    if (!isCurrentPlayIntent(intent)) {
      return false
    }
    applyPendingSeek()
    if (await playFromElement(intent)) {
      applyPendingSeek()
      const ok = !audio.error
      if (!ok) {
        markPlayFailed(audio.error ? `media-${audio.error.code}` : 'error')
        clearSeekState()
      }
      return ok
    }
    isLoading.value = false
    clearSeekState()
    markPlayFailed('play-failed')
    return false
  }

  async function loadAndPlay(url) {
    return playAt(url, null)
  }

  async function play(url) {
    if (url) {
      return playAt(url, null)
    }
    const intent = nextPlayIntent()
    const existing = audio.currentSrc || audio.src
    if (!existing || existing.startsWith('blob:')) {
      dbg('play() no durable source')
      return false
    }
    if (!audio.error && (await playFromElement(intent))) {
      return true
    }
    if (!isCurrentPlayIntent(intent)) {
      return false
    }
    return playAt(existing, currentTimeMs.value || null)
  }

  function pause() {
    cancelPendingPlay()
    audio.pause()
    isLoading.value = false
    isSeeking.value = false
    clearLoadTimeout()
  }

  function stop() {
    cancelPendingPlay()
    audio.pause()
    audio.currentTime = 0
    progress.value = 0
    currentTimeMs.value = 0
    buffered.value = 0
    isLoading.value = false
    clearSeekState()
    clearLoadTimeout()
  }

  // Keep the requested target authoritative until the media element confirms it.
  // This prevents stale timeupdate events from snapping the UI back while loading.
  function queueSeek(ms) {
    if (!Number.isFinite(ms) || ms < 0) {
      return null
    }
    const maxMs = duration.value > 0 ? Math.max(0, duration.value - 50) : ms
    const targetMs = Math.max(0, Math.min(ms, maxMs))
    pendingSeekMs = targetMs
    activeSeekTargetMs = targetMs
    isSeeking.value = Boolean(audio.currentSrc || audio.src)
    syncProgressFromTarget(targetMs)
    verseSeekUntil = Date.now() + 600
    if (canSafelySeek()) {
      applyPendingSeek()
    } else {
      dbg('seek queued until buffered', targetMs)
    }
    return targetMs
  }

  // Queue mid-file seeks until the element can safely demux at that offset.
  function seekTo(ms) {
    return queueSeek(ms)
  }

  function isVerseSeekActive() {
    return activeSeekTargetMs != null || pendingSeekMs != null || Date.now() < verseSeekUntil
  }

  function seek(ratio) {
    if (!Number.isFinite(ratio) || duration.value <= 0) {
      return null
    }
    const clamped = Math.max(0, Math.min(1, ratio))
    return queueSeek(clamped * duration.value)
  }

  function setPlaybackRate(rate) {
    playbackRate.value = rate
    audio.playbackRate = rate
  }

  function setVolume(value) {
    const v = Math.max(0, Math.min(1, value))
    volume.value = v
    applyElementVolume()
  }

  function dismissPlayFailed() {
    clearPlayFailed()
  }

  function getLiveTimeMs() {
    return activeSeekTargetMs ?? audio.currentTime * 1000
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
    clearSeekSettleTimer()
    clearLoadTimeout()
    revokeBlobUrl()
  })

  return {
    isPlaying,
    isLoading,
    isSeeking,
    progress,
    currentTimeMs,
    duration,
    buffered,
    playbackRate,
    volume,
    playFailed,
    lastError,
    setExpectedDuration,
    load,
    loadAndPlay,
    playAt,
    play,
    pause,
    stop,
    seekTo,
    seek,
    isVerseSeekActive,
    isHealthy,
    hasMediaError,
    setPlaybackRate,
    setVolume,
    dismissPlayFailed,
    getLiveTimeMs,
    onTimeUpdate,
    onEnded
  }
}
