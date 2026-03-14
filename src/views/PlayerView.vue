<script setup>
import { onMounted, watch } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useAudio } from '../composables/useAudio.js'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts.js'
import AppHeader from '../components/AppHeader.vue'
import SurahControls from '../components/SurahControls.vue'
import SurahHeader from '../components/SurahHeader.vue'
import VerseDisplay from '../components/VerseDisplay.vue'
import PlayerControls from '../components/PlayerControls.vue'
import VerseList from '../components/VerseList.vue'

const store = usePlayerStore()
const audio = useAudio()

audio.onTimeUpdate((timeMs) => {
  const idx = store.getVerseIndexAtTime(timeMs)
  if (idx !== store.currentVerseIndex) {
    store.currentVerseIndex = idx
  }
})

audio.onEnded(() => {
  audio.stop()
})

function togglePlay() {
  if (audio.isPlaying.value) {
    audio.pause()
  } else if (store.audioUrl) {
    audio.play()
  }
}

function handlePrevVerse() {
  store.prevVerse()
  const timing = store.verseTimings[store.currentVerseIndex]
  if (timing) audio.seekTo(timing.timestampFrom)
}

function handleNextVerse() {
  store.nextVerse()
  const timing = store.verseTimings[store.currentVerseIndex]
  if (timing) audio.seekTo(timing.timestampFrom)
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
  const timing = store.verseTimings[index]
  if (timing) {
    audio.seekTo(timing.timestampFrom)
    if (!audio.isPlaying.value) audio.play()
  }
}

function handleSeek(ratio) {
  audio.seek(ratio)
}

// Preload audio when surah loads (without auto-playing)
let wasPlaying = false
watch(() => store.audioUrl, (url) => {
  wasPlaying = audio.isPlaying.value
  audio.stop()
  if (url) {
    audio.loadAndPlay(url)
    if (!wasPlaying) audio.pause()
  }
})

// Stop audio when reciter changes (surah reload handles the rest)
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
  <div class="max-w-[860px] mx-auto pb-8">
    <AppHeader />
    <SurahControls />
    <main class="px-3 sm:px-4">
      <SurahHeader v-if="store.currentSurah" :surah="store.currentSurah" />
      <VerseDisplay :is-playing="audio.isPlaying.value" @retry="store.loadSurah()" />
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
      <VerseList @select="handleVerseSelect" />
    </main>
  </div>
</template>
