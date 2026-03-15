<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import SearchSelect from './SearchSelect.vue'
import SURAHS from '../data/surahs.js'
import RECITERS from '../data/reciters.js'
import TRANSLATIONS from '../data/translations.js'
import ARABIC_FONTS from '../data/fonts.js'
import THEMES from '../data/themes.js'

const store = usePlayerStore()
const emit = defineEmits(['close'])
const panelRef = ref(null)
let previouslyFocused = null

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

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const REPEAT_MODES = [
  { value: 'none', label: 'Off' },
  { value: 'verse', label: 'Verse' },
  { value: 'surah', label: 'Surah' }
]

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Tab' && panelRef.value) {
    const focusable = panelRef.value.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  if (previouslyFocused) previouslyFocused.focus()
})
</script>

<template>
  <Transition name="settings-panel" appear>
    <div class="fixed inset-0 z-50 flex justify-start" role="dialog" aria-label="Settings" aria-modal="true">
      <div class="absolute inset-0 bg-black/40" @click="emit('close')"></div>

      <div ref="panelRef" class="relative w-full sm:max-w-sm h-full shadow-2xl">
        <div class="bg-card h-full overflow-y-auto scrollable">
          <div class="sticky top-0 bg-card z-10 flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 class="text-base font-semibold text-body">Settings</h2>
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface transition-colors text-muted cursor-pointer"
              aria-label="Close settings"
              @click="emit('close')"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <div class="p-5 space-y-5">
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
              <p class="text-arabic mt-2" dir="rtl" lang="ar" :style="{ fontFamily: store.arabicFontFamily, fontSize: Math.min(store.arabicFontSize, 2.5) + 'rem', lineHeight: 2 }">بِسْمِ اللَّهِ</p>
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
                  :aria-label="'Select ' + theme.name + ' theme'"
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
              <label class="block text-sm font-medium text-muted mb-3">Playback Speed</label>
              <div class="flex gap-1.5">
                <button
                  v-for="s in SPEEDS"
                  :key="s"
                  class="flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  :class="store.playbackSpeed === s ? 'bg-primary text-white' : 'bg-surface text-body hover:bg-border'"
                  @click="store.setPlaybackSpeed(s)"
                >{{ s }}x</button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-muted mb-3">Repeat Mode</label>
              <div class="flex gap-1.5">
                <button
                  v-for="mode in REPEAT_MODES"
                  :key="mode.value"
                  class="flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  :class="store.repeatMode === mode.value ? 'bg-primary text-white' : 'bg-surface text-body hover:bg-border'"
                  @click="store.setRepeatMode(mode.value)"
                >{{ mode.label }}</button>
              </div>
            </div>

            <div class="border-t border-border pt-5 space-y-4">
              <label class="flex items-center justify-between cursor-pointer">
                <span class="text-sm font-medium text-muted">Auto-hide controls during playback</span>
                <input
                  type="checkbox"
                  :checked="store.autoHideControls"
                  class="toggle-switch"
                  @change="store.setAutoHideControls($event.target.checked)"
                />
              </label>
              <label class="flex items-center justify-between cursor-pointer">
                <div>
                  <span class="text-sm font-medium text-muted">Word-by-word highlighting</span>
                  <p class="text-xs text-muted/60 mt-0.5">
                    {{ store.playbackMode === 'verse' ? 'Only available with reciters that support full surah audio' : 'Highlights each word as it is recited' }}
                  </p>
                </div>
                <input
                  type="checkbox"
                  :checked="store.wordHighlight"
                  class="toggle-switch"
                  :disabled="store.playbackMode === 'verse'"
                  @change="store.setWordHighlight($event.target.checked)"
                />
              </label>
              <label class="flex items-center justify-between cursor-pointer">
                <div>
                  <span class="text-sm font-medium text-muted">Animations</span>
                  <p class="text-xs text-muted/60 mt-0.5">Enable transitions and animations</p>
                </div>
                <input
                  type="checkbox"
                  :checked="store.animations"
                  class="toggle-switch"
                  @change="store.setAnimations($event.target.checked)"
                />
              </label>
            </div>

            <div class="border-t border-border pt-5">
              <h3 class="text-sm font-semibold text-body mb-3">About</h3>
              <p class="text-xs text-muted leading-relaxed mb-4">
                I built this app to make listening to and reading the Quran a simple, beautiful experience that works anywhere. No clutter, no distractions, just the words and their meaning, with precise word-by-word highlighting to help you follow along as you listen.
              </p>
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">MI</div>
                <div>
                  <p class="text-sm font-medium text-body">Muhammad Ibnuh</p>
                  <a href="https://ibnuhx.com" target="_blank" rel="noopener noreferrer" class="text-xs text-primary hover:underline">ibnuhx.com</a>
                </div>
              </div>
              <a
                href="https://ibnuhx.com"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                Feedback
              </a>

              <div class="mt-5 pt-4 border-t border-border">
                <h4 class="text-xs font-semibold text-muted mb-2">Credits</h4>
                <ul class="space-y-1.5 text-xs text-muted">
                  <li>
                    <a href="https://alquran.cloud" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors">AlQuran Cloud</a>
                    - Quran text, translations, and per-verse audio
                  </li>
                  <li>
                    <a href="https://quran.com" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors">Quran.com / QDC</a>
                    - Full surah audio and word-level timing data
                  </li>
                  <li>
                    <a href="https://verses.quran.foundation" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors">Quran Foundation</a>
                    - Uthmanic Hafs font
                  </li>
                  <li>
                    <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors">Google Fonts</a>
                    - Amiri and Amiri Quran typefaces
                  </li>
                </ul>
              </div>
            </div>
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
.toggle-switch:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.settings-panel-enter-active,
.settings-panel-leave-active {
  transition: opacity 0.2s ease;
}
.settings-panel-enter-active > :last-child,
.settings-panel-leave-active > :last-child {
  transition: transform 0.25s ease;
}
.settings-panel-enter-from,
.settings-panel-leave-to {
  opacity: 0;
}
.settings-panel-enter-from > :last-child {
  transform: translateX(-100%);
}
.settings-panel-leave-to > :last-child {
  transform: translateX(-100%);
}
</style>
