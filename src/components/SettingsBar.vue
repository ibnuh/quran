<script setup>
import { ref } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import SURAHS from '../data/surahs.js'
import RECITERS from '../data/reciters.js'
import TRANSLATIONS from '../data/translations.js'
import ARABIC_FONTS from '../data/fonts.js'

defineProps({
  visible: { type: Boolean, default: true }
})

const store = usePlayerStore()
const showFontSettings = ref(false)
</script>

<template>
  <Transition name="bar">
    <div v-if="visible" class="hidden md:block bg-card border-b border-border">
    <div class="flex items-center gap-3 px-4 py-2.5 max-w-7xl mx-auto">
      <div class="flex-1 min-w-0">
        <select
          :value="store.currentSurahNum"
          class="bar-select"
          @change="store.setSurah(parseInt($event.target.value))"
        >
          <option v-for="s in SURAHS" :key="s.number" :value="s.number">
            {{ s.number }}. {{ s.englishName }}
          </option>
        </select>
      </div>

      <div class="flex-1 min-w-0">
        <select
          :value="store.currentReciter"
          class="bar-select"
          @change="store.setReciter($event.target.value)"
        >
          <option v-for="r in RECITERS" :key="r.id" :value="r.id">
            {{ r.name }}
          </option>
        </select>
      </div>

      <div class="flex-1 min-w-0">
        <select
          :value="store.currentTranslation"
          class="bar-select"
          @change="store.setTranslation($event.target.value)"
        >
          <option v-for="t in TRANSLATIONS" :key="t.identifier" :value="t.identifier">
            {{ t.englishName }}
          </option>
        </select>
      </div>

      <div class="flex-1 min-w-0">
        <select
          :value="store.arabicFont"
          class="bar-select"
          @change="store.setArabicFont($event.target.value)"
        >
          <option v-for="f in ARABIC_FONTS" :key="f.id" :value="f.id">
            {{ f.name }}
          </option>
        </select>
      </div>

      <button
        class="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
        :class="showFontSettings ? 'bg-primary text-white' : 'text-muted hover:bg-surface'"
        title="Font Size"
        @click="showFontSettings = !showFontSettings"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"/>
        </svg>
      </button>
    </div>

    <Transition name="expand">
      <div v-if="showFontSettings" class="border-t border-border px-4 py-3 max-w-7xl mx-auto">
        <div class="flex items-center gap-8">
          <div class="flex items-center gap-3 flex-1">
            <label class="text-xs font-medium text-muted whitespace-nowrap">Arabic Size</label>
            <input
              type="range"
              min="1.5"
              max="5"
              step="0.1"
              :value="store.arabicFontSize"
              class="range-field flex-1"
              @input="store.setArabicFontSize(parseFloat($event.target.value))"
            />
            <span class="text-xs text-muted w-8 text-right">{{ store.arabicFontSize.toFixed(1) }}</span>
          </div>
          <div class="flex items-center gap-3 flex-1">
            <label class="text-xs font-medium text-muted whitespace-nowrap">Translation Size</label>
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.05"
              :value="store.translationFontSize"
              class="range-field flex-1"
              @input="store.setTranslationFontSize(parseFloat($event.target.value))"
            />
            <span class="text-xs text-muted w-8 text-right">{{ store.translationFontSize.toFixed(1) }}</span>
          </div>
          <div class="flex items-center gap-3 flex-1">
            <label class="text-xs font-medium text-muted whitespace-nowrap">Content Width</label>
            <input
              type="range"
              min="30"
              max="100"
              step="5"
              :value="store.contentWidth"
              class="range-field flex-1"
              @input="store.setContentWidth(parseFloat($event.target.value))"
            />
            <span class="text-xs text-muted w-8 text-right">{{ store.contentWidth }}</span>
          </div>
        </div>
      </div>
    </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.bar-select {
  width: 100%;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.8rem;
  padding: 0.45rem 1.8rem 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
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
.bar-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.range-field {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
  outline: none;
  cursor: pointer;
}
.range-field::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
}
.range-field::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: none;
  background: var(--color-primary);
  cursor: pointer;
}

.bar-enter-active,
.bar-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.bar-enter-from,
.bar-leave-to {
  max-height: 0;
  opacity: 0;
}
.bar-enter-to,
.bar-leave-from {
  max-height: 8rem;
  opacity: 1;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 4rem;
}
</style>
