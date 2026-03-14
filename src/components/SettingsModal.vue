<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import SearchSelect from './SearchSelect.vue'
import SURAHS from '../data/surahs.js'
import RECITERS from '../data/reciters.js'
import TRANSLATIONS from '../data/translations.js'
import ARABIC_FONTS from '../data/fonts.js'
import THEMES from '../data/themes.js'

const store = usePlayerStore()
const emit = defineEmits(['close'])

const surahOptions = computed(() =>
  SURAHS.map(s => ({ value: s.number, label: `${s.number}. ${s.englishName} - ${s.englishNameTranslation}` }))
)
const reciterOptions = computed(() =>
  RECITERS.map(r => ({ value: r.id, label: r.name }))
)
const translationOptions = computed(() =>
  TRANSLATIONS.map(t => ({ value: t.identifier, label: t.englishName }))
)
const fontOptions = computed(() =>
  ARABIC_FONTS.map(f => ({ value: f.id, label: `${f.name} - ${f.description}` }))
)

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="modal">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')"></div>

      <div class="relative bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-body">Settings</h2>
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface transition-colors text-muted cursor-pointer"
            @click="emit('close')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-muted mb-1.5">Surah</label>
            <SearchSelect
              :model-value="store.currentSurahNum"
              :options="surahOptions"
              placeholder="Search surah..."
              @update:model-value="store.setSurah($event)"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-muted mb-1.5">Reciter</label>
            <SearchSelect
              :model-value="store.currentReciter"
              :options="reciterOptions"
              placeholder="Search reciter..."
              @update:model-value="store.setReciter($event)"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-muted mb-1.5">Translation</label>
            <SearchSelect
              :model-value="store.currentTranslation"
              :options="translationOptions"
              placeholder="Search translation..."
              @update:model-value="store.setTranslation($event)"
            />
          </div>

          <div class="border-t border-border pt-5">
            <label class="block text-sm font-medium text-muted mb-1.5">Arabic Font</label>
            <SearchSelect
              :model-value="store.arabicFont"
              :options="fontOptions"
              placeholder="Search font..."
              @update:model-value="store.setArabicFont($event)"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-muted mb-3">Arabic Font Size</label>
            <div class="flex items-center gap-3">
              <input
                type="range"
                min="1.5"
                max="5"
                step="0.1"
                :value="store.arabicFontSize"
                class="range-field flex-1"
                @input="store.setArabicFontSize(parseFloat($event.target.value))"
              />
              <span class="font-arabic text-body w-12 text-right text-sm">{{ store.arabicFontSize.toFixed(1) }}</span>
            </div>
            <p class="text-arabic mt-2" dir="rtl" :style="{ fontFamily: store.arabicFontFamily, fontSize: store.arabicFontSize + 'rem', lineHeight: 2 }">بِسْمِ اللَّهِ</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-muted mb-3">Translation Font Size</label>
            <div class="flex items-center gap-3">
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                :value="store.translationFontSize"
                class="range-field flex-1"
                @input="store.setTranslationFontSize(parseFloat($event.target.value))"
              />
              <span class="text-body w-12 text-right text-sm">{{ store.translationFontSize.toFixed(1) }}</span>
            </div>
            <p class="text-muted font-light mt-2" :style="{ fontSize: store.translationFontSize + 'rem' }">In the name of God</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-muted mb-3">Content Width</label>
            <div class="flex items-center gap-3">
              <input
                type="range"
                min="30"
                max="100"
                step="5"
                :value="store.contentWidth"
                class="range-field flex-1"
                @input="store.setContentWidth(parseFloat($event.target.value))"
              />
              <span class="text-body w-12 text-right text-sm">{{ store.contentWidth }}</span>
            </div>
          </div>

          <div class="border-t border-border pt-5">
            <label class="block text-sm font-medium text-muted mb-3">Theme</label>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="theme in THEMES"
                :key="theme.id"
                class="flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer"
                :class="store.theme === theme.id ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-surface'"
                @click="store.setTheme(theme.id)"
              >
                <span
                  class="w-8 h-8 rounded-full border-2"
                  :style="{ background: theme.colors.surface, borderColor: theme.colors.primary }"
                ></span>
                <span class="text-[0.65rem] text-body">{{ theme.name }}</span>
              </button>
            </div>
          </div>

          <div class="border-t border-border pt-5">
            <label class="flex items-center justify-between cursor-pointer">
              <span class="text-sm font-medium text-muted">Auto-hide controls during playback</span>
              <input
                type="checkbox"
                :checked="store.autoHideControls"
                class="toggle-switch"
                @change="store.setAutoHideControls($event.target.checked)"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.range-field {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
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

.toggle-switch {
  -webkit-appearance: none;
  appearance: none;
  width: 2.75rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: var(--color-border);
  position: relative;
  cursor: pointer;
  transition: background 0.2s ease;
  flex-shrink: 0;
}
.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s ease;
}
.toggle-switch:checked {
  background: var(--color-primary);
}
.toggle-switch:checked::after {
  transform: translateX(1.25rem);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
