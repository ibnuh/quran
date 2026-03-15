<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useAudio } from '../composables/useAudio.js'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts.js'
import { useSwipe } from '../composables/useSwipe.js'
import THEMES from '../data/themes.js'
import AppHeader from '../components/AppHeader.vue'
import SettingsBar from '../components/SettingsBar.vue'
import SettingsModal from '../components/SettingsModal.vue'
import VerseDisplay from '../components/VerseDisplay.vue'
import PlayerControls from '../components/PlayerControls.vue'
import VerseList from '../components/VerseList.vue'
import KeyboardShortcuts from '../components/KeyboardShortcuts.vue'

const store = usePlayerStore()
const audio = useAudio()

const showSettings = ref(false)
const showSettingsBar = ref(true)
const showVerses = ref(false)
const showShortcuts = ref(false)
const isOnline = ref(navigator.onLine)
const mainRef = ref(null)
const headerRef = ref(null)
const controlsRef = ref(null)
const headerHeight = ref(0)
const controlsHeight = ref(0)

const activeThemeColors = computed(() =>
  THEMES.find(t => t.id === store.theme)?.colors || THEMES[0].colors
)

const statusBarFill = computed(() => {
  if (showSettings.value || showVerses.value) return activeThemeColors.value.card
  if (!isOnline.value) return '#d97706'
  return activeThemeColors.value.primary
})

function updateHeaderHeight() {
  if (headerRef.value) {
    headerHeight.value = headerRef.value.offsetHeight
    document.documentElement.style.setProperty('--header-height', headerHeight.value + 'px')
  }
  if (controlsRef.value) {
    controlsHeight.value = controlsRef.value.offsetHeight
  }
}
const showMobileTip = ref(false)
const tipDismissed = ref(localStorage.getItem('quran-tip-dismissed') === '1')


// -- Online/offline detection --
function onOnline() { isOnline.value = true }
function onOffline() { isOnline.value = false }

let headerObserver = null
onMounted(() => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  headerObserver = new ResizeObserver(updateHeaderHeight)
  if (headerRef.value) headerObserver.observe(headerRef.value)
  if (controlsRef.value) headerObserver.observe(controlsRef.value)
  updateHeaderHeight()
})
onBeforeUnmount(() => {
  if (headerObserver) headerObserver.disconnect()
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

// -- Mobile tip: recommend landscape + auto-hide --
const tipMessage = ref('')
const tipAction = ref('') // 'auto-hide' | 'landscape' | 'both'

let tipTimer = null

function checkMobileTip() {
  if (tipDismissed.value) return
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
    tipTimer = setTimeout(dismissTipPermanently, 8000)
  }
}

function dismissTipPermanently() {
  showMobileTip.value = false
  tipDismissed.value = true
  localStorage.setItem('quran-tip-dismissed', '1')
}

function applyMobileTip() {
  if (!store.autoHideControls) store.setAutoHideControls(true)
  dismissTipPermanently()
}

function dismissMobileTip() {
  dismissTipPermanently()
}

let orientationCleanup = null
watch(() => store.autoHideControls, () => checkMobileTip())

// -- Auto-hide controls (YouTube-style) --
const controlsVisible = ref(true)
let hideTimer = null
const AUTO_HIDE_DELAY = 3000

function showControls() {
  controlsVisible.value = true
  resetHideTimer()
}

function resetHideTimer() {
  clearTimeout(hideTimer)
  if (!store.autoHideControls || !audio.isPlaying.value) return
  hideTimer = setTimeout(() => {
    if (store.autoHideControls && audio.isPlaying.value && !showSettings.value && !showVerses.value) {
      controlsVisible.value = false
    }
  }, AUTO_HIDE_DELAY)
}

function onMainTap() {
  if (showSettings.value || showVerses.value || showShortcuts.value) return

  const isMobileViewport = window.innerWidth < 768 || window.innerHeight < 768
  if (isTouchDevice || isMobileViewport) {
    if (controlsVisible.value) {
      controlsVisible.value = false
      clearTimeout(hideTimer)
    } else {
      showControls()
    }
    return
  }

  if (!store.autoHideControls) return
  if (!controlsVisible.value) {
    showControls()
  } else if (audio.isPlaying.value) {
    controlsVisible.value = false
  }
}

// Root-level touch capture is more reliable on iOS standalone than relying on
// bubbling from the scroll container or verse text nodes.
let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0
let lastTouchTapTime = 0

let isTouchDevice = false

function shouldIgnoreMobileToggle(target) {
  if (showSettings.value || showVerses.value || showShortcuts.value) return true
  if (!target) return false
  if (headerRef.value?.contains(target)) return true
  if (controlsRef.value?.contains(target)) return true
  if (target.closest?.('[role="dialog"], button, input, select, textarea, a, label')) return true
  return false
}

function onRootTouchStart(e) {
  if (e.touches.length !== 1) return
  const touch = e.touches[0]
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  touchStartTime = Date.now()
}

function onRootTouchEnd(e) {
  isTouchDevice = true
  const touch = e.changedTouches[0]
  const dx = Math.abs(touch.clientX - touchStartX)
  const dy = Math.abs(touch.clientY - touchStartY)
  const dt = Date.now() - touchStartTime
  if (dx < 12 && dy < 12 && dt < 350 && !shouldIgnoreMobileToggle(e.target)) {
    lastTouchTapTime = Date.now()
    onMainTap()
  }
}

function onMainClick() {
  // Ignore the synthetic click right after a touch tap to avoid double-fire.
  if (Date.now() - lastTouchTapTime < 400) return
  onMainTap()
}

watch(() => audio.isPlaying.value, (playing) => {
  if (!playing) {
    controlsVisible.value = true
    clearTimeout(hideTimer)
  } else if (store.autoHideControls) {
    resetHideTimer()
  }
})

watch(() => store.autoHideControls, (enabled) => {
  if (!enabled) {
    controlsVisible.value = true
    clearTimeout(hideTimer)
  } else if (audio.isPlaying.value) {
    resetHideTimer()
  }
})

onBeforeUnmount(() => { clearTimeout(hideTimer); clearTimeout(tipTimer); clearTimeout(savePrefTimer) })

// -- Swipe gestures --
useSwipe(mainRef, {
  onSwipeLeft: () => {
    if (store.canNextVerse) handleNextVerse()
  },
  onSwipeRight: () => {
    if (store.canPrevVerse) handlePrevVerse()
  }
})

// -- Preloader for verse-by-verse mode --
const preloadCache = []

function getPreloadCount() {
  const conn = navigator.connection
  if (!conn) return 3
  if (conn.effectiveType === '4g') return 5
  if (conn.effectiveType === '3g') return 3
  return 1
}

function preloadAhead() {
  if (store.playbackMode !== 'verse') return

  preloadCache.forEach(a => { a.src = '' })
  preloadCache.length = 0

  const count = getPreloadCount()
  const start = store.currentVerseIndex + 1
  const end = Math.min(start + count, store.audioUrls.length)

  for (let i = start; i < end; i++) {
    const a = new Audio()
    a.preload = 'auto'
    a.src = store.audioUrls[i]
    preloadCache.push(a)
  }
}

onBeforeUnmount(() => {
  preloadCache.forEach(a => { a.src = '' })
  preloadCache.length = 0
})

// -- Preload next surah near end --
let preloadedNext = false
watch(() => store.currentVerseIndex, (idx) => {
  if (!preloadedNext && store.totalVerses > 0 && idx >= store.totalVerses - 3) {
    preloadedNext = true
    store.preloadNextSurah()
  }
})

watch(() => store.currentSurahNum, () => {
  preloadedNext = false
})

// -- RAF-based word highlighting for ~16ms precision --
let rafId = null
let savePrefTimer = null

function debouncedSavePrefs() {
  clearTimeout(savePrefTimer)
  savePrefTimer = setTimeout(() => store.savePreferences(), 1000)
}

function startWordHighlightLoop() {
  if (rafId) return
  function tick() {
    const timeMs = audio.getLiveTimeMs()
    const idx = store.getVerseIndexAtTime(timeMs)
    if (idx !== store.currentVerseIndex) {
      store.currentVerseIndex = idx
      store.currentWordIndex = -1
      debouncedSavePrefs()
    }
    store.currentWordIndex = store.getWordIndexAtTime(timeMs, idx)
    // Update progress from RAF for smoother bar movement
    const dur = audio.duration.value
    if (dur > 0) {
      audio.progress.value = (timeMs / dur) * 100
      audio.currentTimeMs.value = timeMs
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

function stopWordHighlightLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// Start/stop RAF loop based on playing state + word highlight + full mode
watch(
  [() => audio.isPlaying.value, () => store.wordHighlight, () => store.playbackMode],
  ([playing, highlight, mode]) => {
    if (playing && highlight && mode === 'full') {
      startWordHighlightLoop()
    } else {
      stopWordHighlightLoop()
    }
  }
)

onBeforeUnmount(() => stopWordHighlightLoop())

// -- Audio event handlers --
audio.onTimeUpdate((timeMs) => {
  // Skip when RAF loop is active (it handles everything at higher precision)
  if (rafId) return
  if (store.playbackMode === 'full') {
    const idx = store.getVerseIndexAtTime(timeMs)
    if (idx !== store.currentVerseIndex) {
      store.currentVerseIndex = idx
      store.currentWordIndex = -1
      debouncedSavePrefs()
    }
    if (store.wordHighlight) {
      store.currentWordIndex = store.getWordIndexAtTime(timeMs, idx)
    }
  }
})

audio.onEnded(() => {
  // Repeat verse: replay current verse
  if (store.repeatMode === 'verse') {
    if (store.playbackMode === 'full') {
      const timing = store.verseTimings[store.currentVerseIndex]
      if (timing) {
        audio.seekTo(timing.timestampFrom)
        audio.play()
      }
    } else {
      audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
    }
    return
  }

  if (store.playbackMode === 'verse' && store.canNextVerse) {
    store.nextVerse()
    audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
    preloadAhead()
  } else if (store.repeatMode === 'surah') {
    // Repeat surah: go back to start
    store.currentVerseIndex = 0
    store.currentWordIndex = -1
    if (store.playbackMode === 'full') {
      audio.seekTo(0)
      audio.play()
    } else if (store.audioUrls.length) {
      audio.loadAndPlay(store.audioUrls[0])
      preloadAhead()
    }
  } else {
    audio.stop()
    store.currentWordIndex = -1
  }
})

// -- Controls --
function togglePlay() {
  if (audio.isPlaying.value) {
    audio.pause()
    return
  }

  if (store.playbackMode === 'full' && store.audioUrl) {
    audio.play()
  } else if (store.playbackMode === 'verse' && store.audioUrls.length) {
    audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
    preloadAhead()
  }
}

function handlePrevVerse() {
  store.prevVerse()
  if (store.playbackMode === 'full') {
    const timing = store.verseTimings[store.currentVerseIndex]
    if (timing) audio.seekTo(timing.timestampFrom)
  } else if (audio.isPlaying.value) {
    audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
    preloadAhead()
  }
}

function handleNextVerse() {
  store.nextVerse()
  if (store.playbackMode === 'full') {
    const timing = store.verseTimings[store.currentVerseIndex]
    if (timing) audio.seekTo(timing.timestampFrom)
  } else if (audio.isPlaying.value) {
    audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
    preloadAhead()
  }
}

function handlePrevSurah() {
  audio.stop()
  store.prevSurah()
}

function handleNextSurah() {
  audio.stop()
  store.nextSurah()
}

function handleVerseSelect(index) {
  store.setVerse(index)
  if (store.playbackMode === 'full') {
    const timing = store.verseTimings[index]
    if (timing) {
      audio.seekTo(timing.timestampFrom)
      if (!audio.isPlaying.value) audio.play()
    }
  } else {
    audio.loadAndPlay(store.audioUrls[index])
    preloadAhead()
  }
}

function handleSeek(ratio) {
  audio.seek(ratio)
}

function handleSetSpeed(speed) {
  store.setPlaybackSpeed(speed)
  audio.setPlaybackRate(speed)
}

// Preload full surah audio when URL changes (without auto-playing)
watch(() => store.audioUrl, (url) => {
  if (url && store.playbackMode === 'full') {
    const wasPlaying = audio.isPlaying.value
    audio.stop()
    if (wasPlaying) {
      audio.loadAndPlay(url)
    } else {
      audio.load(url)
    }
  }
})

// Stop audio on surah/reciter change
watch(
  () => [store.currentSurahNum, store.currentReciter],
  () => { audio.stop() }
)

// Sync playback speed when it changes in settings
watch(() => store.playbackSpeed, (speed) => {
  audio.setPlaybackRate(speed)
})

useKeyboardShortcuts({
  togglePlay,
  nextVerse: handleNextVerse,
  prevVerse: handlePrevVerse,
  toggleHelp: () => { showShortcuts.value = !showShortcuts.value }
})

// -- Dynamic document title --
watch(
  () => [store.currentSurah, store.currentVerse],
  ([surah, verse]) => {
    if (surah && verse) {
      document.title = `${surah.englishName} ${verse.number} - Quran Player`
    } else if (surah) {
      document.title = `${surah.englishName} - Quran Player`
    } else {
      document.title = 'Quran Player'
    }
  }
)

// -- Media Session API (lock screen / notification controls) --
function updateMediaSession() {
  if (!('mediaSession' in navigator)) return
  const surah = store.currentSurah
  const verse = store.currentVerse
  if (!surah) return

  navigator.mediaSession.metadata = new MediaMetadata({
    title: `${surah.englishName} - Verse ${verse?.number || 1}`,
    artist: store.currentReciterData?.name || 'Quran Player',
    album: surah.englishNameTranslation
  })

  navigator.mediaSession.setActionHandler('play', togglePlay)
  navigator.mediaSession.setActionHandler('pause', togglePlay)
  navigator.mediaSession.setActionHandler('previoustrack', () => {
    if (store.canPrevVerse) handlePrevVerse()
  })
  navigator.mediaSession.setActionHandler('nexttrack', () => {
    if (store.canNextVerse) handleNextVerse()
  })
}

watch(
  () => [store.currentSurahNum, store.currentVerseIndex, store.currentReciter],
  () => updateMediaSession()
)

// -- Screen Wake Lock API (prevent screen dimming during playback) --
let wakeLock = null

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return
  try {
    wakeLock = await navigator.wakeLock.request('screen')
    wakeLock.addEventListener('release', () => {
      wakeLock = null
    })
  } catch (e) {
    // Wake lock request can fail (e.g. low battery, background tab)
    wakeLock = null
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release()
    wakeLock = null
  }
}

watch(() => audio.isPlaying.value, (playing) => {
  if (playing) {
    acquireWakeLock()
  } else {
    releaseWakeLock()
  }
})

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && audio.isPlaying.value) {
    acquireWakeLock()
  }
}

onMounted(async () => {
  store.loadPreferences()

  // Handle PWA shortcut query param (?surah=36)
  const params = new URLSearchParams(window.location.search)
  const surahParam = parseInt(params.get('surah'))
  if (surahParam >= 1 && surahParam <= 114) {
    store.currentSurahNum = surahParam
    store.currentVerseIndex = 0
  }

  audio.setPlaybackRate(store.playbackSpeed)
  await store.loadSurah()
  if (store.currentVerseIndex > 0 && store.playbackMode === 'full') {
    const timing = store.verseTimings[store.currentVerseIndex]
    if (timing) audio.seekTo(timing.timestampFrom)
  }
  updateMediaSession()
  checkMobileTip()
  window.addEventListener('resize', checkMobileTip)
  if ('wakeLock' in navigator) {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
  orientationCleanup = () => window.removeEventListener('resize', checkMobileTip)
})

onBeforeUnmount(() => {
  if (orientationCleanup) orientationCleanup()
  releaseWakeLock()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div
    class="fixed top-0 right-0 bottom-0 left-0 bg-surface overflow-hidden"
    @mousemove="showControls"
    @touchstart.capture.passive="onRootTouchStart"
    @touchend.capture.passive="onRootTouchEnd"
  >
    <div
      class="fixed top-0 left-0 right-0 z-[60] pointer-events-none"
      :style="{ height: 'env(safe-area-inset-top, 0px)', background: statusBarFill }"
    ></div>

    <!-- Offline banner -->
    <Transition name="offline-bar">
      <div v-if="!isOnline" class="absolute top-0 left-0 right-0 z-50 bg-amber-600 text-white text-center text-xs pb-1.5 px-4 font-medium" style="padding-top: max(0.375rem, env(safe-area-inset-top, 0px))">
        You are offline. Some features may not be available.
      </div>
    </Transition>

    <div
      ref="headerRef"
      class="absolute top-0 left-0 right-0 z-40 transition-all duration-300"
      :class="controlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'"
    >
      <AppHeader
        @open-settings="showSettings = true"
        @toggle-settings-bar="showSettingsBar = !showSettingsBar"
        @toggle-verses="showVerses = !showVerses"
        @toggle-shortcuts="showShortcuts = !showShortcuts"
      />
      <SettingsBar :visible="showSettingsBar" @collapse="showSettingsBar = false" />
    </div>

    <main
      ref="mainRef"
      class="h-full flex flex-col overflow-y-auto scrollable cursor-pointer select-none"
      :style="{
        paddingTop: ((headerHeight || 16) + 16) + 'px',
        paddingLeft: 'max(1rem, env(safe-area-inset-left), env(safe-area-inset-right))',
        paddingRight: 'max(1rem, env(safe-area-inset-left), env(safe-area-inset-right))',
        paddingBottom: Math.max(controlsHeight, 16) + 'px'
      }"
      @click="onMainClick"
    >
      <VerseDisplay class="m-auto" @retry="store.loadSurah()" />
    </main>

    <div
      ref="controlsRef"
      class="fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 bg-card/80 backdrop-blur-sm border-t border-border"
      :class="controlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'"
    >
      <PlayerControls
        :is-playing="audio.isPlaying.value"
        :progress="audio.progress.value"
        :buffered="audio.buffered.value"
        :current-time-ms="audio.currentTimeMs.value"
        :duration-ms="audio.duration.value"
        @toggle-play="togglePlay"
        @prev-verse="handlePrevVerse"
        @next-verse="handleNextVerse"
        @prev-surah="handlePrevSurah"
        @next-surah="handleNextSurah"
        @seek="handleSeek"
        @set-speed="handleSetSpeed"
      />
    </div>

    <SettingsModal v-if="showSettings" @close="showSettings = false" />
    <VerseList v-if="showVerses" @close="showVerses = false" @select="handleVerseSelect" />
    <KeyboardShortcuts v-if="showShortcuts" @close="showShortcuts = false" />

    <!-- Mobile tip -->
    <Transition name="tip">
      <div
        v-if="showMobileTip"
        class="fixed left-4 right-4 z-30 flex items-center gap-3 bg-card border border-border rounded-xl shadow-xl px-4 py-3 md:hidden"
        :style="{ top: (headerHeight + 8) + 'px' }"
      >
        <svg class="shrink-0 text-primary" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        <p class="text-xs text-body flex-1">{{ tipMessage }}</p>
        <button
          v-if="tipAction === 'auto-hide' || tipAction === 'both'"
          class="shrink-0 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer"
          @click="applyMobileTip"
        >{{ tipAction === 'both' ? 'Enable Auto-hide' : 'Enable' }}</button>
        <button
          class="shrink-0 text-muted cursor-pointer p-1"
          aria-label="Dismiss"
          @click="dismissMobileTip"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.offline-bar-enter-active,
.offline-bar-leave-active {
  transition: all 0.3s ease;
}
.offline-bar-enter-from,
.offline-bar-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.tip-enter-active,
.tip-leave-active {
  transition: all 0.3s ease;
}
.tip-enter-from,
.tip-leave-to {
  opacity: 0;
  transform: translateY(-1rem);
}
</style>
