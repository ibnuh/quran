import { ref, onBeforeUnmount } from 'vue'

export function useAudio() {
  const audio = new Audio()
  audio.preload = 'auto'
  const isPlaying = ref(false)
  const progress = ref(0)
  const currentTimeMs = ref(0)

  let onTimeUpdateCb = null
  let onEndedCb = null

  audio.addEventListener('timeupdate', () => {
    currentTimeMs.value = audio.currentTime * 1000
    if (audio.duration) {
      progress.value = (audio.currentTime / audio.duration) * 100
    }
    if (onTimeUpdateCb) onTimeUpdateCb(currentTimeMs.value)
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

  function loadAndPlay(url) {
    audio.src = url
    audio.play().catch(() => {})
  }

  function play() {
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

  function onTimeUpdate(cb) { onTimeUpdateCb = cb }
  function onEnded(cb) { onEndedCb = cb }

  onBeforeUnmount(() => {
    audio.pause()
    audio.src = ''
  })

  return {
    isPlaying, progress, currentTimeMs,
    loadAndPlay, play, pause, stop, seekTo, seek,
    onTimeUpdate, onEnded
  }
}
