<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useAudio } from '../composables/useAudio.js'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts.js'
import AppHeader from '../components/AppHeader.vue'
import SettingsBar from '../components/SettingsBar.vue'
import SettingsModal from '../components/SettingsModal.vue'
import VerseDisplay from '../components/VerseDisplay.vue'
import PlayerControls from '../components/PlayerControls.vue'
import VerseList from '../components/VerseList.vue'

const store = usePlayerStore()
const audio = useAudio()

const showSettings = ref(false)
const showSettingsBar = ref(true)
const showVerses = ref(false)

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
  if (!store.autoHideControls) return
  if (!controlsVisible.value) {
    showControls()
  } else if (audio.isPlaying.value) {
    controlsVisible.value = false
  }
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

onBeforeUnmount(() => clearTimeout(hideTimer))

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

// -- Audio event handlers --
audio.onTimeUpdate((timeMs) => {
  if (store.playbackMode === 'full') {
    const idx = store.getVerseIndexAtTime(timeMs)
    if (idx !== store.currentVerseIndex) {
      store.currentVerseIndex = idx
    }
  }
})

audio.onEnded(() => {
  if (store.playbackMode === 'verse' && store.canNextVerse) {
    store.nextVerse()
    audio.loadAndPlay(store.audioUrls[store.currentVerseIndex])
    preloadAhead()
  } else {
    audio.stop()
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

// Preload full surah audio when URL changes (without auto-playing)
watch(() => store.audioUrl, (url) => {
  if (url && store.playbackMode === 'full') {
    const wasPlaying = audio.isPlaying.value
    audio.stop()
    audio.loadAndPlay(url)
    if (!wasPlaying) audio.pause()
  }
})

// Stop audio on surah/reciter change
watch(
  () => [store.currentSurahNum, store.currentReciter],
  () => { audio.stop() }
)

useKeyboardShortcuts({
  togglePlay,
  nextVerse: handleNextVerse,
  prevVerse: handlePrevVerse
})

onMounted(() => {
  store.loadPreferences()
  store.loadSurah()
})
</script>

<template>
  <div class="h-dvh flex flex-col bg-surface overflow-hidden" @mousemove="showControls" @touchstart="showControls">
    <div
      class="transition-all duration-300"
      :class="controlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'"
    >
      <AppHeader
        @open-settings="showSettings = true"
        @toggle-settings-bar="showSettingsBar = !showSettingsBar"
        @toggle-verses="showVerses = !showVerses"
      />
      <SettingsBar :visible="showSettingsBar" />
    </div>

    <main
      class="flex-1 flex items-center justify-center px-4 overflow-y-auto scrollable cursor-pointer"
      @click="onMainTap"
    >
      <VerseDisplay @retry="store.loadSurah()" />
    </main>

    <div
      class="transition-all duration-300"
      :class="controlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'"
    >
      <PlayerControls
        :is-playing="audio.isPlaying.value"
        :progress="audio.progress.value"
        @toggle-play="togglePlay"
        @prev-verse="handlePrevVerse"
        @next-verse="handleNextVerse"
        @prev-surah="handlePrevSurah"
        @next-surah="handleNextSurah"
        @seek="handleSeek"
      />
    </div>

    <SettingsModal v-if="showSettings" @close="showSettings = false" />
    <VerseList v-if="showVerses" @close="showVerses = false" @select="handleVerseSelect" />
  </div>
</template>
