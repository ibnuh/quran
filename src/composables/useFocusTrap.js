import { onMounted, onBeforeUnmount, nextTick } from 'vue'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ')

// Trap keyboard focus within a modal/dialog: focus the first control on open,
// keep Tab/Shift+Tab cycling inside, and restore focus to the trigger on close.
export function useFocusTrap(containerRef, { onEscape, autoFocus = true } = {}) {
  let previouslyFocused = null

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
    const active = document.activeElement
    const inside = containerRef.value?.contains(active)
    if (e.shiftKey) {
      if (active === first || !inside) {
        e.preventDefault()
        last.focus()
      }
    } else if (active === last || !inside) {
      e.preventDefault()
      first.focus()
    }
  }

  onMounted(async () => {
    previouslyFocused = document.activeElement
    await nextTick()
    if (autoFocus) {
      const items = focusables()
      if (items.length) {
        items[0].focus()
      } else {
        containerRef.value?.focus?.()
      }
    }
    document.addEventListener('keydown', onKeydown, true)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown, true)
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus()
    }
  })
}
