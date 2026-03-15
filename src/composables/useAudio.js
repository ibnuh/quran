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

  let onTimeUpdateCb = null
  let onEndedCb = null

  audio.addEventListener('timeupdate', () => {
    currentTimeMs.value = audio.currentTime * 1000
    if (audio.duration) {
      progress.value = (audio.currentTime / audio.duration) * 100
      duration.value = audio.duration * 1000
    }
    if (onTimeUpdateCb) onTimeUpdateCb(currentTimeMs.value)
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
    if (onEndedCb) onEndedCb()
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

  function load(url) {
    audio.src = url
    audio.load()
  }

  function loadAndPlay(url) {
    audio.src = url
    audio.playbackRate = playbackRate.value
    audio.play().catch(() => {})
  }

  function play() {
    audio.playbackRate = playbackRate.value
    audio.play().catch(() => {})
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

  function seekTo(ms) {
    audio.currentTime = ms / 1000
    currentTimeMs.value = ms
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

  function onTimeUpdate(cb) { onTimeUpdateCb = cb }
  function onEnded(cb) { onEndedCb = cb }

  onBeforeUnmount(() => {
    audio.pause()
    audio.src = ''
  })

  return {
    isPlaying, progress, currentTimeMs, duration, buffered, playbackRate,
    load, loadAndPlay, play, pause, stop, seekTo, seek,
    setPlaybackRate, getLiveTimeMs,
    onTimeUpdate, onEnded
  }
}
