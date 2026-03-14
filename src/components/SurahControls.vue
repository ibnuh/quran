<script setup>
import { usePlayerStore } from '../stores/player.js'
import SURAHS from '../data/surahs.js'
import RECITERS from '../data/reciters.js'
import TRANSLATIONS from '../data/translations.js'

const store = usePlayerStore()

function onSurahChange(e) {
  store.setSurah(parseInt(e.target.value))
}

function onReciterChange(e) {
  store.setReciter(e.target.value)
}

function onTranslationChange(e) {
  store.setTranslation(e.target.value)
}
</script>

<template>
  <div class="controls">
    <div class="select-group">
      <label for="surah-select">Surah</label>
      <select id="surah-select" :value="store.currentSurahNum" @change="onSurahChange">
        <option
          v-for="s in SURAHS"
          :key="s.number"
          :value="s.number"
        >{{ s.number }}. {{ s.englishName }} - {{ s.englishNameTranslation }}</option>
      </select>
    </div>
    <div class="select-group">
      <label for="reciter-select">Reciter</label>
      <select id="reciter-select" :value="store.currentReciter" @change="onReciterChange">
        <option
          v-for="r in RECITERS"
          :key="r.identifier"
          :value="r.identifier"
        >{{ r.englishName }}</option>
      </select>
    </div>
    <div class="select-group">
      <label for="translation-select">Translation</label>
      <select id="translation-select" :value="store.currentTranslation" @change="onTranslationChange">
        <option
          v-for="t in TRANSLATIONS"
          :key="t.identifier"
          :value="t.identifier"
        >{{ t.englishName }}</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
}

.select-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.select-group label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-light);
}

.select-group select {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.85rem;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23777'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  padding-right: 1.5rem;
  transition: border-color var(--transition);
}

.select-group select:focus {
  outline: none;
  border-color: var(--primary);
}

@media (max-width: 640px) {
  .controls {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 0.75rem;
  }
  .select-group select {
    font-size: 0.9rem;
    padding: 0.6rem;
  }
}

@media (min-width: 641px) {
  .controls {
    border-radius: 0 0 var(--radius) var(--radius);
    margin: 0 1rem;
    border: 1px solid var(--border);
    border-top: none;
  }
}
</style>
