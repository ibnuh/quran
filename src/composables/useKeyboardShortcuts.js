import { onMounted, onBeforeUnmount } from 'vue'

export function useKeyboardShortcuts({ togglePlay, nextVerse, prevVerse, toggleHelp }) {
  function handler(e) {
    // Leave browser and OS combos alone (Alt+Left is back, Ctrl/Meta belong to
    // the system); preventDefault on these would hijack navigation.
    if (e.altKey || e.ctrlKey || e.metaKey) {
      return
    }
    const target = e.target
    if (!target) {
      return
    }
    const tag = target.tagName
    // Ignore when focus is on interactive controls so Space/arrows keep native behavior.
    if (
      tag === 'SELECT' ||
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'BUTTON' ||
      tag === 'A' ||
      target.isContentEditable
    ) {
      return
    }
    if (target.closest('[role="slider"], [role="menu"], [role="menuitem"], button, a, textarea')) {
      return
    }
    // Don't handle shortcuts when a modal/dialog is open (except ? for help toggle)
    if (target.closest('[role="dialog"]') && e.key !== '?') {
      return
    }

    if (e.key === '?') {
      e.preventDefault()
      if (toggleHelp) {
        toggleHelp()
      }
      return
    }

    if (e.code === 'Space') {
      e.preventDefault()
      // Holding Space auto-repeats keydown; toggling on each one would rapidly
      // flip play/pause. Arrows keep repeating for fast navigation.
      if (!e.repeat) {
        togglePlay()
      }
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
