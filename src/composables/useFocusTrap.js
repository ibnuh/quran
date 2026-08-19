import { watch, onBeforeUnmount } from 'vue'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ')

// Active traps, oldest first. Only the most recently activated trap handles
// keys, so a dialog opened from inside another dialog (e.g. the reciter picker
// inside Settings) is not fought by the outer trap: without this, the outer
// trap pulls Tab focus behind the inner overlay and Escape closes both layers.
const trapStack = []

// Trap keyboard focus within a modal/dialog: focus the first control on open,
// keep Tab/Shift+Tab cycling inside, and restore focus to the trigger on close.
// The trap follows the container element itself, so it also works for dialogs
// rendered with v-if inside a long-lived component: it activates when the
// element appears and releases (restoring focus) when it goes away.
export function useFocusTrap(containerRef, { onEscape, autoFocus = true } = {}) {
  let previouslyFocused = null
  let active = false
  const trap = {}

  function focusables() {
    const el = containerRef.value
    if (!el) {
      return []
    }
    return Array.from(el.querySelectorAll(FOCUSABLE)).filter(
      n => n.offsetParent !== null || n === document.activeElement
    )
  }

  function onKeydown(e) {
    if (trapStack[trapStack.length - 1] !== trap) {
      return
    }
    if (e.key === 'Escape' && onEscape) {
      onEscape()
      return
    }
    if (e.key !== 'Tab') {
      return
    }
    const items = focusables()
    if (items.length === 0) {
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const current = document.activeElement
    const inside = containerRef.value?.contains(current)
    if (e.shiftKey) {
      if (current === first || !inside) {
        e.preventDefault()
        last.focus()
      }
    } else if (current === last || !inside) {
      e.preventDefault()
      first.focus()
    }
  }

  function activate() {
    if (active) {
      return
    }
    active = true
    previouslyFocused = document.activeElement
    trapStack.push(trap)
    document.addEventListener('keydown', onKeydown, true)
    if (autoFocus) {
      const items = focusables()
      if (items.length) {
        items[0].focus()
      } else {
        containerRef.value?.focus?.()
      }
    }
  }

  function deactivate() {
    if (!active) {
      return
    }
    active = false
    const idx = trapStack.indexOf(trap)
    if (idx >= 0) {
      trapStack.splice(idx, 1)
    }
    document.removeEventListener('keydown', onKeydown, true)
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus()
    }
    previouslyFocused = null
  }

  // flush: 'post' so the container's children are in the DOM before autoFocus.
  watch(containerRef, el => (el ? activate() : deactivate()), { immediate: true, flush: 'post' })

  onBeforeUnmount(deactivate)
}
