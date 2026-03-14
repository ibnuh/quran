<script setup>
import { usePlayerStore } from '../stores/player.js'
import ProgressBar from './ProgressBar.vue'

const store = usePlayerStore()

defineProps({
  isPlaying: Boolean,
  progress: { type: Number, default: 0 }
})

const emit = defineEmits(['toggle-play', 'prev-verse', 'next-verse', 'prev-surah', 'next-surah', 'seek'])
</script>

<template>
  <div class="px-6 pb-6 pt-2 landscape-compact:pb-2 landscape-compact:pt-1 landscape-compact:px-4">
    <ProgressBar :progress="progress" @seek="emit('seek', $event)" />

    <div class="flex items-center justify-center gap-1 mt-3 landscape-compact:mt-1">
      <button
        class="btn-nav"
        :disabled="!store.canPrevSurah"
        title="Previous Surah"
        @click="emit('prev-surah')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
      </button>

      <button
        class="btn-nav"
        :disabled="!store.canPrevVerse"
        title="Previous Verse"
        @click="emit('prev-verse')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>

      <button
        class="w-14 h-14 landscape-compact:w-10 landscape-compact:h-10 rounded-full bg-primary text-white flex items-center justify-center mx-1.5 shadow-md hover:bg-primary-dark hover:scale-105 active:scale-[0.97] transition-all duration-200 cursor-pointer"
        title="Play / Pause"
        @click="emit('toggle-play')"
      >
        <svg v-if="!isPlaying" width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        <svg v-else width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>

      <button
        class="btn-nav"
        :disabled="!store.canNextVerse"
        title="Next Verse"
        @click="emit('next-verse')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </button>

      <button
        class="btn-nav"
        :disabled="!store.canNextSurah"
        title="Next Surah"
        @click="emit('next-surah')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      </button>
    </div>

    <div v-if="store.currentVerse" class="text-center text-xs text-muted mt-2 landscape-compact:hidden">
      Verse {{ store.currentVerse.number }} of {{ store.totalVerses }}
    </div>
  </div>
</template>

<style scoped>
.btn-nav {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  border: none;
  background: none;
  color: var(--color-body);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-nav:hover:not(:disabled) {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
.btn-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
