import { onMounted, onBeforeUnmount } from 'vue'

export function useKeyboardShortcuts({ togglePlay, nextVerse, prevVerse, toggleHelp }) {
  function handler(e) {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return
    // Don't handle shortcuts when a modal/dialog is open (except ? for help toggle)
    if (e.target.closest('[role="dialog"]') && e.key !== '?') return

    if (e.key === '?') {
      e.preventDefault()
      if (toggleHelp) toggleHelp()
      return
    }

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
