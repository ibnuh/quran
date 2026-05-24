import { ref, watch, onBeforeUnmount } from 'vue'
import { AUTO_HIDE_DELAY } from '../config.js'

// YouTube-style auto-hiding header/controls. Tap (mobile) or click/idle (desktop)
// toggles visibility while audio is playing.
export function useAutoHideControls({ store, audio, isAnyPanelOpen, headerRef, controlsRef }) {
  const controlsVisible = ref(true)
  let hideTimer = null

  let touchStartX = 0
  let touchStartY = 0
  let touchStartTime = 0
  let lastTouchTapTime = 0

  function showControls() {
    controlsVisible.value = true
    resetHideTimer()
  }

  function hideControls() {
    controlsVisible.value = false
    clearTimeout(hideTimer)
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
      hideControls()
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
    onRootTouchStart,
    onRootTouchEnd
  }
}
