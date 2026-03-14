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

audio.onEnded(() => {
  if (store.canNextVerse) {
    store.nextVerse()
    audio.play(store.currentAudioUrl)
  } else {
    audio.stop()
  }
})

audio.onError(() => {
  if (audio.isPlaying.value && store.canNextVerse) {
    store.nextVerse()
    audio.play(store.currentAudioUrl)
  }
})

function togglePlay() {
  if (audio.isPlaying.value) {
    audio.pause()
  } else if (store.currentAudioUrl) {
    audio.play(store.currentAudioUrl)
  }
}

function handlePrevVerse() {
  store.prevVerse()
  if (audio.isPlaying.value) {
    audio.play(store.currentAudioUrl)
  }
}

function handleNextVerse() {
  store.nextVerse()
  if (audio.isPlaying.value) {
    audio.play(store.currentAudioUrl)
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
  if (audio.isPlaying.value) {
    audio.play(store.currentAudioUrl)
  }
}

function handleSeek(ratio) {
  audio.seek(ratio)
}

// Stop audio when surah/reciter/translation changes via controls
watch(
  () => [store.currentSurahNum, store.currentReciter, store.currentTranslation],
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
  <div class="app">
    <AppHeader />
    <SurahControls />
    <main class="main">
      <SurahHeader v-if="store.currentSurah" :surah="store.currentSurah" />
      <VerseDisplay
        :is-playing="audio.isPlaying.value"
        @retry="store.loadSurah()"
      />
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

<style scoped>
.app {
  max-width: 860px;
  margin: 0 auto;
  padding-bottom: 2rem;
}

.main {
  padding: 0 1rem;
}

@media (max-width: 640px) {
  .main {
    padding: 0 0.75rem;
  }
}
</style>
