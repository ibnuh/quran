<script setup>
import { usePlayerStore } from '../stores/player.js'
import ProgressBar from './ProgressBar.vue'

const store = usePlayerStore()

defineProps({
  isPlaying: Boolean,
  progress: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['toggle-play', 'prev-verse', 'next-verse', 'prev-surah', 'next-surah', 'seek'])
</script>

<template>
  <div class="player-controls">
    <ProgressBar :progress="progress" @seek="emit('seek', $event)" />

    <div class="player-buttons">
      <button
        class="btn btn-nav"
        :disabled="!store.canPrevSurah"
        title="Previous Surah"
        @click="emit('prev-surah')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
        </svg>
      </button>

      <button
        class="btn btn-nav"
        :disabled="!store.canPrevVerse"
        title="Previous Verse"
        @click="emit('prev-verse')"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>

      <button
        class="btn btn-play"
        title="Play / Pause"
        @click="emit('toggle-play')"
      >
        <svg v-if="!isPlaying" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      </button>

      <button
        class="btn btn-nav"
        :disabled="!store.canNextVerse"
        title="Next Verse"
        @click="emit('next-verse')"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>

      <button
        class="btn btn-nav"
        :disabled="!store.canNextSurah"
        title="Next Surah"
        @click="emit('next-surah')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
        </svg>
      </button>
    </div>

    <div v-if="store.currentVerse" class="verse-indicator">
      Verse {{ store.currentVerse.number }} of {{ store.totalVerses }}
    </div>
  </div>
</template>

<style scoped>
.player-controls {
  padding: 1.25rem 0;
}

.player-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
  color: var(--text);
  font-family: 'Inter', sans-serif;
}

.btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-nav {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.btn-nav:hover:not(:disabled) {
  background: var(--primary-light);
  color: var(--primary);
}

.btn-play {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  margin: 0 0.5rem;
  box-shadow: 0 2px 8px rgba(26, 107, 75, 0.3);
}

.btn-play:hover {
  background: var(--primary-dark);
  transform: scale(1.05);
}

.btn-play:active {
  transform: scale(0.97);
}

.verse-indicator {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-light);
  margin-top: 0.75rem;
}

@media (max-width: 640px) {
  .btn-play {
    width: 52px;
    height: 52px;
  }
}
</style>
