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
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 bg-card border-b border-border sm:mx-4 sm:border sm:border-t-0 sm:rounded-b-xl">
    <div class="flex flex-col gap-1">
      <label for="surah-select" class="text-[0.7rem] font-semibold uppercase tracking-wider text-muted">Surah</label>
      <select
        id="surah-select"
        :value="store.currentSurahNum"
        class="select-field"
        @change="onSurahChange"
      >
        <option v-for="s in SURAHS" :key="s.number" :value="s.number">
          {{ s.number }}. {{ s.englishName }} - {{ s.englishNameTranslation }}
        </option>
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <label for="reciter-select" class="text-[0.7rem] font-semibold uppercase tracking-wider text-muted">Reciter</label>
      <select
        id="reciter-select"
        :value="store.currentReciter"
        class="select-field"
        @change="onReciterChange"
      >
        <option v-for="r in RECITERS" :key="r.id" :value="r.id">
          {{ r.name }}
        </option>
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <label for="translation-select" class="text-[0.7rem] font-semibold uppercase tracking-wider text-muted">Translation</label>
      <select
        id="translation-select"
        :value="store.currentTranslation"
        class="select-field"
        @change="onTranslationChange"
      >
        <option v-for="t in TRANSLATIONS" :key="t.identifier" :value="t.identifier">
          {{ t.englishName }}
        </option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.select-field {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.85rem;
  padding: 0.5rem 1.5rem 0.5rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface);
  color: var(--color-body);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23777'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  transition: border-color 0.2s ease;
}
.select-field:focus {
  outline: none;
  border-color: var(--color-primary);
}
@media (max-width: 640px) {
  .select-field {
    font-size: 0.9rem;
    padding: 0.6rem 1.5rem 0.6rem 0.6rem;
  }
}
</style>
