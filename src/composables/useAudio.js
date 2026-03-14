import { ref, onBeforeUnmount } from 'vue'

export function useAudio() {
  const audio = new Audio()
  const isPlaying = ref(false)
  const progress = ref(0)

  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      progress.value = (audio.currentTime / audio.duration) * 100
    }
  })

  let onEndedCb = null
  let onErrorCb = null

  audio.addEventListener('ended', () => {
    isPlaying.value = false
    progress.value = 0
    if (onEndedCb) onEndedCb()
  })

  audio.addEventListener('error', () => {
    if (onErrorCb) onErrorCb()
  })

  function play(url) {
    if (url) {
      audio.src = url
    }
    audio.play().catch(() => {})
    isPlaying.value = true
  }

  function pause() {
    audio.pause()
    isPlaying.value = false
  }

  function stop() {
    audio.pause()
    audio.currentTime = 0
    isPlaying.value = false
    progress.value = 0
  }

  function seek(ratio) {
    if (audio.duration) {
      audio.currentTime = ratio * audio.duration
    }
  }

  function onEnded(cb) {
    onEndedCb = cb
  }

  function onError(cb) {
    onErrorCb = cb
  }

  onBeforeUnmount(() => {
    audio.pause()
    audio.src = ''
  })

  return { isPlaying, progress, play, pause, stop, seek, onEnded, onError }
}
