<script setup>
import { usePlayerStore } from '../stores/player.js'

defineProps({
  isPlaying: Boolean
})

const emit = defineEmits(['retry'])
const store = usePlayerStore()
</script>

<template>
  <div class="verse-display" :class="{ playing: isPlaying }">
    <div v-if="store.isLoading" class="loading">
      <div class="spinner"></div>
      <p>Loading surah...</p>
    </div>

    <div v-else-if="store.error" class="error-message">
      <p>{{ store.error }}</p>
      <button class="btn-retry" @click="emit('retry')">Retry</button>
    </div>

    <div v-else-if="store.currentVerse" class="verse-content">
      <div v-if="store.showBismillah" class="bismillah">
        <p class="bismillah-text">{{"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"}}</p>
      </div>
      <p class="verse-arabic" dir="rtl">{{ store.currentVerse.text }}</p>
      <span class="verse-number-badge">{{ store.currentVerse.number }}</span>
      <p class="verse-translation">{{ store.currentTranslationVerse?.text }}</p>
    </div>
  </div>
</template>

<style scoped>
.verse-display {
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 2rem 1.5rem;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: box-shadow var(--transition), border-color var(--transition);
  border: 1px solid var(--border);
}

.verse-display.playing {
  box-shadow: var(--shadow-lg);
  border-color: var(--primary);
}

.loading {
  text-align: center;
  color: var(--text-light);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 0.75rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  text-align: center;
  color: #c0392b;
}

.error-message p {
  margin-bottom: 0.75rem;
}

.btn-retry {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.85rem;
  font-family: 'Inter', sans-serif;
}

.btn-retry:hover {
  background: var(--primary-dark);
}

.verse-content {
  width: 100%;
  text-align: center;
}

.bismillah {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.bismillah-text {
  font-family: 'Amiri', serif;
  font-size: 1.6rem;
  color: var(--accent);
  direction: rtl;
  margin: 0;
}

.verse-arabic {
  font-family: 'Amiri', serif;
  font-size: 2rem;
  line-height: 2;
  color: var(--text-arabic);
  direction: rtl;
  text-align: center;
  margin: 0 0 0.75rem;
  word-spacing: 0.1em;
}

.verse-number-badge {
  display: inline-block;
  background: var(--primary);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  width: 28px;
  height: 28px;
  line-height: 28px;
  border-radius: 50%;
  text-align: center;
  margin-bottom: 0.75rem;
}

.verse-translation {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text);
  font-weight: 300;
  max-width: 600px;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .verse-display {
    padding: 1.5rem 1rem;
    border-radius: var(--radius-sm);
  }
  .verse-arabic {
    font-size: 1.6rem;
    line-height: 1.9;
  }
  .bismillah-text {
    font-size: 1.3rem;
  }
  .verse-translation {
    font-size: 0.92rem;
  }
}

@media (min-width: 641px) {
  .verse-display {
    padding: 2.5rem 2rem;
  }
  .verse-arabic {
    font-size: 2.2rem;
  }
  .verse-translation {
    font-size: 1.05rem;
  }
}
</style>
