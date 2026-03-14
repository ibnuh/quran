import { onMounted, onBeforeUnmount } from 'vue'

export function useKeyboardShortcuts({ togglePlay, nextVerse, prevVerse }) {
  function handler(e) {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return

    if (e.code === 'Space') {
      e.preventDefault()
      togglePlay()
    } else if (e.code === 'ArrowRight') {
      e.preventDefault()
      nextVerse()
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault()
      prevVerse()
    }
  }

  onMounted(() => document.addEventListener('keydown', handler))
  onBeforeUnmount(() => document.removeEventListener('keydown', handler))
}
