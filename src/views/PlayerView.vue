<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch, defineAsyncComponent } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useAudio } from '../composables/useAudio.js'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts.js'
import { useSwipe } from '../composables/useSwipe.js'
import { useScreenReader } from '../composables/useScreenReader.js'
import { usePlayback } from '../composables/usePlayback.js'
import { useWordHighlight } from '../composables/useWordHighlight.js'
import { useAutoHideControls } from '../composables/useAutoHideControls.js'
import { useMediaSession } from '../composables/useMediaSession.js'
import { useWakeLock } from '../composables/useWakeLock.js'
import { useMobileTip } from '../composables/useMobileTip.js'
import { useDeepLink } from '../composables/useDeepLink.js'
import { useSleepTimer } from '../composables/useSleepTimer.js'
import { useSeo } from '../composables/useSeo.js'
import THEMES, { resolveThemeId } from '../data/themes.js'
import AppHeader from '../components/AppHeader.vue'
import SettingsBar from '../components/SettingsBar.vue'
const SettingsModal = defineAsyncComponent(() => import('../components/SettingsModal.vue'))
const BookmarksPanel = defineAsyncComponent(() => import('../components/BookmarksPanel.vue'))
const SearchPanel = defineAsyncComponent(() => import('../components/SearchPanel.vue'))
const TafsirPanel = defineAsyncComponent(() => import('../components/TafsirPanel.vue'))
import VerseDisplay from '../components/VerseDisplay.vue'
const ReadingView = defineAsyncComponent(() => import('../components/ReadingView.vue'))
import PlayerControls from '../components/PlayerControls.vue'
import VerseList from '../components/VerseList.vue'
import KeyboardShortcuts from '../components/KeyboardShortcuts.vue'

const store = usePlayerStore()
const audio = useAudio()
const { announce } = useScreenReader()

// -- Panel state --
const showSettings = ref(false)
const showSettingsBar = ref(true)
const showVerses = ref(false)
const showShortcuts = ref(false)
const showBookmarks = ref(false)
const showSearch = ref(false)
const showTafsir = ref(false)
const isAnyPanelOpen = () =>
  showSettings.value ||
  showVerses.value ||
  showShortcuts.value ||
  showBookmarks.value ||
  showSearch.value ||
  showTafsir.value

// -- Layout refs --
const isOnline = ref(navigator.onLine)
const mainRef = ref(null)
const headerRef = ref(null)
const controlsRef = ref(null)
const headerHeight = ref(56)
const controlsHeight = ref(140)

const activeThemeColors = computed(
  () => THEMES.find(t => t.id === resolveThemeId(store.theme))?.colors || THEMES[0].colors
)
const WARNING_COLOR = '#d97706'
const statusBarFill = computed(() => {
  if (showSettings.value || showVerses.value || showBookmarks.value) {
    return activeThemeColors.value.card
  }
  if (!isOnline.value) {
    return WARNING_COLOR
  }
  return activeThemeColors.value.primary
})

// -- Playback orchestration --
const playback = usePlayback(store, audio)
const {
  togglePlay,
  handlePrevVerse,
  handleNextVerse,
  handlePrevSurah,
  handleNextSurah,
  handleVerseSelect,
  handleJumpToVerse,
  handleGoToBookmark,
  handleSeek,
  handleSetSpeed
} = playback

useWordHighlight(store, audio, announce)
useWakeLock(audio.isPlaying)
const mediaSession = useMediaSession(store, {
  togglePlay,
  prevVerse: handlePrevVerse,
  nextVerse: handleNextVerse
})

// -- Auto-hide controls --
const { controlsVisible, showControls, onMainClick, onRootTouchStart, onRootTouchEnd } =
  useAutoHideControls({ store, audio, isAnyPanelOpen, headerRef, controlsRef })

// -- Mobile tip --
const { showMobileTip, tipMessage, tipAction, checkMobileTip, applyMobileTip, dismissMobileTip } =
  useMobileTip(store)

// -- Deep links (/2/255) --
function jumpToAyah(ayah) {
  const idx = store.verses.findIndex(v => v.number === ayah)
  if (idx >= 0) {
    handleJumpToVerse(idx)
  }
}

function applyDeepLink(surah, ayah) {
  if (surah === store.currentSurahNum) {
    if (ayah) {
      jumpToAyah(ayah)
    }
    return
  }
  audio.stop()
  const unsub = watch(
    () => store.isLoading,
    loading => {
      if (!loading && !store.error) {
        if (ayah) {
          jumpToAyah(ayah)
        }
        unsub()
      }
    }
  )
  store.setSurah(surah)
}

const deepLink = useDeepLink(applyDeepLink)

// -- Sleep timer --
const sleepTimer = useSleepTimer(() => audio.pause())

// -- Swipe gestures --
useSwipe(mainRef, {
  onSwipeLeft: () => {
    if (store.canNextVerse) {
      handleNextVerse()
    }
  },
  onSwipeRight: () => {
    if (store.canPrevVerse) {
      handlePrevVerse()
    }
  }
})

useKeyboardShortcuts({
  togglePlay,
  nextVerse: handleNextVerse,
  prevVerse: handlePrevVerse,
  toggleHelp: () => {
    showShortcuts.value = !showShortcuts.value
  }
})

// -- Header/controls height tracking --
function updateHeaderHeight() {
  let newHeaderH = 0
  let newControlsH = 0
  if (headerRef.value) {
    newHeaderH = headerRef.value.offsetHeight
  }
  if (controlsRef.value) {
    newControlsH = controlsRef.value.offsetHeight
  }
  requestAnimationFrame(() => {
    if (newHeaderH !== headerHeight.value) {
      headerHeight.value = newHeaderH
      document.documentElement.style.setProperty('--header-height', newHeaderH + 'px')
    }
    if (newControlsH !== controlsHeight.value) {
      controlsHeight.value = newControlsH
    }
  })
}

// -- Online/offline detection --
function onOnline() {
  isOnline.value = true
}
function onOffline() {
  isOnline.value = false
}

let headerObserver = null
onBeforeUnmount(() => {
  if (headerObserver) {
    headerObserver.disconnect()
  }
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

// -- Document title + sharing metadata (per surah/verse) --
useSeo(store)

onMounted(async () => {
  store.loadPreferences()

  // A deep link (/2/255 or ?surah=36) takes precedence over restored prefs.
  const { surah, ayah } = deepLink.initial()
  if (surah) {
    store.currentSurahNum = surah
    store.currentVerseIndex = 0
  }

  audio.setPlaybackRate(store.playbackSpeed)
  audio.setVolume(store.volume)
  await store.loadSurah()
  if (surah && ayah) {
    const idx = store.verses.findIndex(v => v.number === ayah)
    if (idx >= 0) {
      store.currentVerseIndex = idx
    }
  }
  if (store.currentVerseIndex > 0 && store.playbackMode === 'full') {
    const timing = store.verseTimings[store.currentVerseIndex]
    if (timing) {
      audio.seekTo(timing.timestampFrom)
    }
  }
  mediaSession.update()
  checkMobileTip()

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  headerObserver = new ResizeObserver(updateHeaderHeight)
  if (headerRef.value) {
    headerObserver.observe(headerRef.value)
  }
  if (controlsRef.value) {
    headerObserver.observe(controlsRef.value)
  }
  updateHeaderHeight()
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
      <div
        v-if="!isOnline"
        class="absolute top-0 left-0 right-0 z-50 bg-amber-600 text-white text-center text-xs pb-1.5 px-4 font-medium"
        style="padding-top: max(0.375rem, env(safe-area-inset-top, 0px))"
      >
        {{ $t('app.offline') }}
      </div>
    </Transition>

    <div
      ref="headerRef"
      class="absolute top-0 left-0 right-0 z-40"
      :style="{
        transition:
          'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
      }"
      :class="
        controlsVisible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0 pointer-events-none'
      "
    >
      <AppHeader
        @open-settings="showSettings = true"
        @toggle-settings-bar="showSettingsBar = !showSettingsBar"
        @toggle-verses="showVerses = !showVerses"
        @toggle-shortcuts="showShortcuts = !showShortcuts"
        @toggle-bookmarks="showBookmarks = !showBookmarks"
        @toggle-search="showSearch = !showSearch"
      />
      <div class="absolute top-full left-0 right-0 pointer-events-none">
        <SettingsBar :visible="showSettingsBar" @collapse="showSettingsBar = false" />
      </div>
    </div>

    <main
      ref="mainRef"
      class="h-full flex flex-col overflow-y-auto scrollable cursor-pointer select-none"
      :style="{
        transition: 'padding-top 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        paddingTop: (headerHeight || 16) + 24 + 'px',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        paddingBottom: Math.max(controlsHeight, 16) + 'px',
        // Center the verse when it fits, but fall back to top-aligned and scrollable
        // when it is taller than the viewport so long ayahs are never clipped.
        justifyContent: 'safe center'
      }"
      @click="onMainClick"
    >
      <VerseDisplay
        v-if="!store.readingMode || store.isLoading || store.error || !store.totalVerses"
        class="mx-auto"
        @retry="store.loadSurah()"
        @open-tafsir="showTafsir = true"
      />
      <ReadingView v-else @select="handleVerseSelect" />
    </main>

    <div
      ref="controlsRef"
      class="fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-sm border-t border-border"
      :style="{
        transition:
          'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
      }"
      style="padding-bottom: env(safe-area-inset-bottom, 0px)"
      :class="
        controlsVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0 pointer-events-none'
      "
    >
      <PlayerControls
        :is-playing="audio.isPlaying.value"
        :progress="audio.progress.value"
        :buffered="audio.buffered.value"
        :current-time-ms="audio.currentTimeMs.value"
        :duration-ms="audio.duration.value"
        :sleep-minutes="sleepTimer.activeMinutes.value"
        :sleep-remaining-ms="sleepTimer.remainingMs.value"
        @toggle-play="togglePlay"
        @prev-verse="handlePrevVerse"
        @next-verse="handleNextVerse"
        @prev-surah="handlePrevSurah"
        @next-surah="handleNextSurah"
        @seek="handleSeek"
        @set-speed="handleSetSpeed"
        @jump-to-verse="handleJumpToVerse"
        @set-sleep="sleepTimer.start"
      />
    </div>

    <SettingsModal v-if="showSettings" @close="showSettings = false" />
    <VerseList v-if="showVerses" @close="showVerses = false" @select="handleVerseSelect" />
    <BookmarksPanel
      v-if="showBookmarks"
      @close="showBookmarks = false"
      @select="handleGoToBookmark"
    />
    <KeyboardShortcuts v-if="showShortcuts" @close="showShortcuts = false" />
    <SearchPanel
      v-if="showSearch"
      @close="showSearch = false"
      @select-surah="applyDeepLink($event)"
      @select-verse="handleJumpToVerse"
    />
    <TafsirPanel v-if="showTafsir" @close="showTafsir = false" />

    <!-- Mobile tip -->
    <Transition name="tip">
      <div
        v-if="showMobileTip"
        class="fixed left-4 right-4 z-30 flex items-center gap-3 bg-card border border-border rounded-xl shadow-xl px-4 py-3 md:hidden"
        :style="{ top: headerHeight + 8 + 'px' }"
      >
        <svg
          class="shrink-0 text-primary"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
          />
        </svg>
        <p class="text-xs text-body flex-1">{{ tipMessage }}</p>
        <button
          v-if="tipAction === 'auto-hide' || tipAction === 'both'"
          class="shrink-0 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer"
          @click="applyMobileTip"
        >
          {{ tipAction === 'both' ? $t('tip.enableAutoHide') : $t('tip.enable') }}
        </button>
        <button
          class="shrink-0 text-muted cursor-pointer p-1"
          :aria-label="$t('tip.dismiss')"
          @click="dismissMobileTip"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.offline-bar-enter-active,
.offline-bar-leave-active {
  transition:
    opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1),
    transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}
.offline-bar-enter-from,
.offline-bar-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

.tip-enter-active {
  transition:
    opacity 0.35s cubic-bezier(0.25, 1, 0.5, 1),
    transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}
.tip-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1),
    transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.tip-enter-from,
.tip-leave-to {
  opacity: 0;
  transform: translateY(-1rem);
}
</style>
