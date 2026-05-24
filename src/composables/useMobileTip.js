import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { TIP_DISMISSED_KEY, MOBILE_TIP_TIMEOUT } from '../config.js'

// One-time mobile hint suggesting landscape mode and auto-hide controls.
export function useMobileTip(store) {
  const showMobileTip = ref(false)
  const tipDismissed = ref(localStorage.getItem(TIP_DISMISSED_KEY) === '1')
  const tipMessage = ref('')
  const tipAction = ref('') // 'auto-hide' | 'landscape' | 'both'
  let tipTimer = null

  function dismissPermanently() {
    showMobileTip.value = false
    tipDismissed.value = true
    localStorage.setItem(TIP_DISMISSED_KEY, '1')
  }

  function checkMobileTip() {
    if (tipDismissed.value) {
      return
    }
    const isMobile = window.innerWidth < 768 || window.innerHeight < 768
    const isLandscape = window.innerWidth > window.innerHeight

    if (!isMobile) {
      showMobileTip.value = false
      return
    }

    if (!isLandscape && !store.autoHideControls) {
      tipMessage.value = 'Try landscape mode with auto-hide for a better reading experience'
      tipAction.value = 'both'
      showMobileTip.value = true
    } else if (!isLandscape) {
      tipMessage.value = 'Try landscape mode for a wider, more immersive reading experience'
      tipAction.value = 'landscape'
      showMobileTip.value = true
    } else if (!store.autoHideControls) {
      tipMessage.value = 'Enable auto-hide for a more immersive experience'
      tipAction.value = 'auto-hide'
      showMobileTip.value = true
    } else {
      showMobileTip.value = false
    }

    if (showMobileTip.value) {
      clearTimeout(tipTimer)
      tipTimer = setTimeout(dismissPermanently, MOBILE_TIP_TIMEOUT)
    }
  }

  function applyMobileTip() {
    if (!store.autoHideControls) {
      store.setAutoHideControls(true)
    }
    dismissPermanently()
  }

  watch(() => store.autoHideControls, () => checkMobileTip())

  onMounted(() => {
    window.addEventListener('resize', checkMobileTip)
  })

  onBeforeUnmount(() => {
    clearTimeout(tipTimer)
    window.removeEventListener('resize', checkMobileTip)
  })

  return {
    showMobileTip,
    tipMessage,
    tipAction,
    checkMobileTip,
    applyMobileTip,
    dismissMobileTip: dismissPermanently
  }
}
