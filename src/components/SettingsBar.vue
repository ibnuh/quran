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

const store = usePlayerStore()
const showFontSettings = ref(false)

const surahOptions = computed(() =>
  SURAHS.map(s => ({ value: s.number, label: `${s.number}. ${s.englishName}` }))
)
const reciterOptions = computed(() =>
  RECITERS.map(r => ({ value: r.id, label: r.name }))
)
const translationOptions = computed(() =>
  TRANSLATIONS.map(t => ({ value: t.identifier, label: t.englishName }))
)
const fontOptions = computed(() =>
  ARABIC_FONTS.map(f => ({ value: f.id, label: f.name }))
)
</script>

<template>
  <Transition name="bar">
    <div v-if="visible" class="hidden md:block landscape-compact:!hidden bg-card border-b border-border">
    <div class="flex items-center gap-3 px-4 py-2.5 max-w-7xl mx-auto">
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
          <label class="flex items-center gap-2 cursor-pointer shrink-0">
            <span class="text-xs font-medium text-muted whitespace-nowrap">Auto-hide</span>
            <input
              type="checkbox"
              :checked="store.autoHideControls"
              class="bar-toggle"
              @change="store.setAutoHideControls($event.target.checked)"
            />
          </label>
        </div>
      </div>
    </Transition>
    </div>
  </Transition>
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

.bar-toggle {
  -webkit-appearance: none;
  appearance: none;
  width: 2.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background: var(--color-border);
  position: relative;
  cursor: pointer;
  transition: background 0.2s ease;
  flex-shrink: 0;
}
.bar-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  transition: transform 0.2s ease;
}
.bar-toggle:checked {
  background: var(--color-primary);
}
.bar-toggle:checked::after {
  transform: translateX(1rem);
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
