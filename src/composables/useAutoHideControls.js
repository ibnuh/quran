import { ref, watch, onBeforeUnmount } from 'vue'
import { AUTO_HIDE_DELAY } from '../config.js'

// Ignore tiny pointer jitter and the mousemove browsers often fire with a click.
const MOVE_SHOW_THRESHOLD_PX = 6
// After the user deliberately hides chrome, require either this grace window to
// elapse or a real mouse move before mousemove can re-show it.
const HIDE_SUPPRESS_MS = 450

// YouTube-style auto-hiding header/controls. Tap (mobile) or click/idle (desktop)
// toggles visibility while audio is playing.
export function useAutoHideControls({ store, audio, isAnyPanelOpen, headerRef, controlsRef }) {
  const controlsVisible = ref(true)
  let hideTimer = null
  let suppressShowUntil = 0
  let lastMouseX = null
  let lastMouseY = null

  let touchStartX = 0
  let touchStartY = 0
  let touchStartTime = 0
  let lastTouchTapTime = 0

  function showControls() {
    controlsVisible.value = true
    suppressShowUntil = 0
    resetHideTimer()
  }

  function hideControls({ intentional = false } = {}) {
    controlsVisible.value = false
    clearTimeout(hideTimer)
    if (intentional) {
      // Block the synthetic mousemove that often accompanies the same click.
      suppressShowUntil = Date.now() + HIDE_SUPPRESS_MS
    }
  }

  function resetHideTimer() {
    clearTimeout(hideTimer)
    if (!store.autoHideControls || !audio.isPlaying.value) {
      return
    }
    hideTimer = setTimeout(() => {
      if (store.autoHideControls && audio.isPlaying.value && !isAnyPanelOpen()) {
        hideControls()
      }
    }, AUTO_HIDE_DELAY)
  }

  // Tap/click in the empty reading area toggles the header and controls so the user
  // always has an easy way to reveal or hide them, independent of the auto-hide setting.
  function toggleControls() {
    if (isAnyPanelOpen()) {
      return
    }
    if (controlsVisible.value) {
      hideControls({ intentional: true })
    } else {
      showControls()
    }
  }

  function onMainTap() {
    toggleControls()
  }

  function onMainClick(e) {
    // Ignore the synthetic click right after a touch tap to avoid a double-fire.
    if (Date.now() - lastTouchTapTime < 400) {
      return
    }
    // Ignore clicks on interactive elements (buttons, links, the verse rows in
    // reading mode, etc.) so only taps on empty space toggle the controls.
    if (shouldIgnoreMobileToggle(e?.target)) {
      return
    }
    onMainTap()
  }

  // Desktop: only re-show chrome when the pointer actually moves. Clicks often
  // emit a zero/near-zero mousemove that used to undo hide immediately.
  function onMouseMove(e) {
    const x = e.clientX
    const y = e.clientY

    if (lastMouseX == null || lastMouseY == null) {
      lastMouseX = x
      lastMouseY = y
      return
    }

    const dx = Math.abs(x - lastMouseX)
    const dy = Math.abs(y - lastMouseY)
    lastMouseX = x
    lastMouseY = y

    if (dx < MOVE_SHOW_THRESHOLD_PX && dy < MOVE_SHOW_THRESHOLD_PX) {
      return
    }

    if (Date.now() < suppressShowUntil) {
      return
    }

    showControls()
  }

  function shouldIgnoreMobileToggle(target) {
    if (isAnyPanelOpen()) {
      return true
    }
    if (!target) {
      return false
    }
    if (headerRef.value?.contains(target)) {
      return true
    }
    if (controlsRef.value?.contains(target)) {
      return true
    }
    if (target.closest?.('[role="dialog"], button, input, select, textarea, a, label')) {
      return true
    }
    return false
  }

  function onRootTouchStart(e) {
    if (e.touches.length !== 1) {
      return
    }
    const touch = e.touches[0]
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    touchStartTime = Date.now()
  }

  function onRootTouchEnd(e) {
    const touch = e.changedTouches[0]
    const dx = Math.abs(touch.clientX - touchStartX)
    const dy = Math.abs(touch.clientY - touchStartY)
    const dt = Date.now() - touchStartTime
    if (dx < 12 && dy < 12 && dt < 350 && !shouldIgnoreMobileToggle(e.target)) {
      lastTouchTapTime = Date.now()
      onMainTap()
    }
  }

  watch(
    () => audio.isPlaying.value,
    playing => {
      if (!playing) {
        controlsVisible.value = true
        suppressShowUntil = 0
        clearTimeout(hideTimer)
      } else if (store.autoHideControls) {
        resetHideTimer()
      }
    }
  )

  watch(
    () => store.autoHideControls,
    enabled => {
      if (!enabled) {
        controlsVisible.value = true
        suppressShowUntil = 0
        clearTimeout(hideTimer)
      } else if (audio.isPlaying.value) {
        resetHideTimer()
      }
    }
  )

  onBeforeUnmount(() => clearTimeout(hideTimer))

  return {
    controlsVisible,
    showControls,
    hideControls,
    toggleControls,
    onMainTap,
    onMainClick,
    onMouseMove,
    onRootTouchStart,
    onRootTouchEnd
  }
}
