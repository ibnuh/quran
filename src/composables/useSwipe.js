import { onMounted, onBeforeUnmount } from 'vue'

export function useSwipe(elementRef, { onSwipeLeft, onSwipeRight, threshold = 50 }) {
  let startX = 0
  let startY = 0
  let tracking = false

  function onTouchStart(e) {
    const touch = e.touches[0]
    startX = touch.clientX
    startY = touch.clientY
    tracking = true
  }

  function onTouchEnd(e) {
    if (!tracking) return
    tracking = false

    const touch = e.changedTouches[0]
    const dx = touch.clientX - startX
    const dy = touch.clientY - startY

    // Only trigger if horizontal movement is dominant and exceeds threshold
    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0 && onSwipeRight) {
        onSwipeRight()
      } else if (dx < 0 && onSwipeLeft) {
        onSwipeLeft()
      }
    }
  }

  onMounted(() => {
    const el = elementRef.value
    if (!el) return
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onBeforeUnmount(() => {
    const el = elementRef.value
    if (!el) return
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchend', onTouchEnd)
  })
}
