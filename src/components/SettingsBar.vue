<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import SearchSelect from './SearchSelect.vue'
import SURAHS from '../data/surahs.js'
import RECITERS from '../data/reciters.js'
import TRANSLATIONS from '../data/translations.js'
import ARABIC_FONTS from '../data/fonts.js'

defineProps({
  visible: { type: Boolean, default: true }
})

const emit = defineEmits(['collapse'])

const store = usePlayerStore()
const showFontSettings = ref(false)

const surahOptions = computed(() =>
  SURAHS.map(s => ({ value: s.number, label: `${s.number}. ${s.englishName} - ${s.englishNameTranslation}` }))
)
const reciterOptions = computed(() =>
  RECITERS.map(r => ({ value: r.id, label: r.name }))
)
const currentLang = computed(() => {
  const id = store.currentTranslation
  if (id.startsWith('qdc.')) {
    const t = TRANSLATIONS.find(t => t.identifier === id)
    return t ? t.language : 'en'
  }
  return id.split('.')[0] || 'en'
})
const translationOptions = computed(() =>
  TRANSLATIONS.filter(t => t.language === currentLang.value)
    .map(t => ({ value: t.identifier, label: t.englishName }))
)
const fontOptions = computed(() =>
  ARABIC_FONTS.map(f => ({ value: f.id, label: f.name }))
)
</script>

<template>
  <div
    class="settings-bar-shell hidden lg:block landscape-compact:!hidden"
    :class="visible ? 'settings-bar-shell-open' : 'settings-bar-shell-closed'"
    :aria-hidden="!visible"
  >
    <div class="bg-card border-b border-border">
      <div class="flex items-center flex-wrap gap-3 px-4 py-2.5 max-w-7xl mx-auto">
      <div class="flex-1 min-w-0">
        <SearchSelect
          :model-value="store.currentSurahNum"
          :options="surahOptions"
          placeholder="Search surah..."
          compact
          @update:model-value="store.setSurah($event)"
        />
      </div>

      <div class="flex-1 min-w-0">
        <SearchSelect
          :model-value="store.currentReciter"
          :options="reciterOptions"
          placeholder="Search reciter..."
          compact
          @update:model-value="store.setReciter($event)"
        />
      </div>

      <div class="flex-1 min-w-0">
        <SearchSelect
          :model-value="store.currentTranslation"
          :options="translationOptions"
          placeholder="Search translation..."
          compact
          @update:model-value="store.setTranslation($event)"
        />
      </div>

      <div class="flex-1 min-w-0">
        <SearchSelect
          :model-value="store.arabicFont"
          :options="fontOptions"
          placeholder="Search font..."
          compact
          @update:model-value="store.setArabicFont($event)"
        />
      </div>

      <button
        class="shrink-0 h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
        :class="showFontSettings ? 'bg-primary text-white' : 'text-muted hover:bg-surface'"
        aria-label="Toggle display settings"
        @click="showFontSettings = !showFontSettings"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"/>
        </svg>
        <span>Display</span>
      </button>
      <button
        class="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-surface transition-colors cursor-pointer"
        aria-label="Collapse settings bar"
        @click="emit('collapse')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
        </svg>
      </button>
      </div>

      <div class="font-settings-shell" :class="showFontSettings ? 'font-settings-shell-open' : ''">
        <div class="font-settings-panel">
          <div class="border-t border-border px-4 py-3 max-w-7xl mx-auto">
            <div class="flex items-center gap-8">
          <div class="flex items-center gap-3 flex-1">
            <label class="text-xs font-medium text-muted whitespace-nowrap">Arabic Size</label>
            <input
              type="range"
              min="1.5"
              max="5"
              step="0.1"
              :value="store.arabicFontSize"
              :aria-label="'Arabic font size: ' + store.arabicFontSize.toFixed(1)"
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
              :aria-label="'Translation font size: ' + store.translationFontSize.toFixed(1)"
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
              :aria-label="'Content width: ' + store.contentWidth + '%'"
              class="range-field flex-1"
              @input="store.setContentWidth(parseFloat($event.target.value))"
            />
            <span class="text-xs text-muted w-8 text-right">{{ store.contentWidth }}</span>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
}
.range-field::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: var(--color-primary);
  cursor: pointer;
}

.settings-bar-shell {
  transform-origin: top center;
  transition: opacity 0.24s cubic-bezier(0.25, 1, 0.5, 1), transform 0.24s cubic-bezier(0.25, 1, 0.5, 1);
}
.settings-bar-shell-open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.settings-bar-shell-closed {
  opacity: 0;
  transform: translateY(-0.75rem);
  pointer-events: none;
}

.font-settings-shell {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-0.35rem);
  transition: grid-template-rows 0.25s cubic-bezier(0.25, 1, 0.5, 1),
    opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1),
    transform 0.25s cubic-bezier(0.25, 1, 0.5, 1);
}
.font-settings-shell-open {
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translateY(0);
}
.font-settings-panel {
  overflow: hidden;
  min-height: 0;
}
</style>
