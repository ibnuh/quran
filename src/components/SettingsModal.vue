<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import SearchSelect from './SearchSelect.vue'
import SURAHS from '../data/surahs.js'
import RECITERS from '../data/reciters.js'
import TRANSLATIONS, { LANGUAGES } from '../data/translations.js'
import ARABIC_FONTS from '../data/fonts.js'
import THEMES from '../data/themes.js'

const store = usePlayerStore()
const emit = defineEmits(['close'])
const panelRef = ref(null)
let previouslyFocused = null

const appVersion = __APP_VERSION__

// Install app
const canInstall = ref(false)
let deferredInstallPrompt = null
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone
const showIOSInstructions = ref(false)

function onBeforeInstallPrompt(e) {
  e.preventDefault()
  deferredInstallPrompt = e
  canInstall.value = true
}

async function installApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt()
    const { outcome } = await deferredInstallPrompt.userChoice
    if (outcome === 'accepted') canInstall.value = false
    deferredInstallPrompt = null
  } else if (isIOS) {
    showIOSInstructions.value = !showIOSInstructions.value
  }
}

// Force update
const updateChecking = ref(false)
const updateAvailable = ref(false)

async function forceUpdate() {
  updateChecking.value = true
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration) {
      await registration.update()
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        updateAvailable.value = true
        setTimeout(() => window.location.reload(), 500)
        return
      }
    }
    // If no update found, just reload
    window.location.reload()
  } catch (e) {
    window.location.reload()
  }
}

// Reset settings
function resetSettings() {
  if (confirm('Reset all settings to defaults? This will reload the page.')) {
    localStorage.removeItem('quran-player-prefs')
    localStorage.removeItem('quran-tip-dismissed')
    localStorage.removeItem('quran-pwa-install-dismissed')
    window.location.reload()
  }
}

function getLangFromTranslation(id) {
  if (id.startsWith('qdc.')) {
    const t = TRANSLATIONS.find(t => t.identifier === id)
    return t ? t.language : 'en'
  }
  return id.split('.')[0] || 'en'
}

const selectedLanguage = ref(getLangFromTranslation(store.currentTranslation))

const surahOptions = computed(() =>
  SURAHS.map(s => ({ value: s.number, label: `${s.number}. ${s.englishName} - ${s.englishNameTranslation}` }))
)
const reciterOptions = computed(() =>
  RECITERS.map(r => ({ value: r.id, label: r.name }))
)
const languageOptions = computed(() =>
  LANGUAGES.filter(l => TRANSLATIONS.some(t => t.language === l.code))
    .map(l => ({ value: l.code, label: l.name }))
)
const translationOptions = computed(() =>
  TRANSLATIONS.filter(t => t.language === selectedLanguage.value)
    .map(t => ({ value: t.identifier, label: t.englishName }))
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

function onLanguageChange(code) {
  selectedLanguage.value = code
  const firstTranslation = TRANSLATIONS.find(t => t.language === code)
  if (firstTranslation) {
    store.setTranslation(firstTranslation.identifier)
  }
}

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
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
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
              <label class="block text-sm font-medium text-muted mb-1.5">Translation Language</label>
              <SearchSelect
                :model-value="selectedLanguage"
                :options="languageOptions"
                placeholder="Search language..."
                @update:model-value="onLanguageChange($event)"
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
              <div class="grid grid-cols-5 gap-2 gap-y-3">
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

            <!-- App actions -->
            <div class="border-t border-border pt-5 space-y-2">
              <button
                v-if="canInstall || (isIOS && !isStandalone)"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                @click="installApp"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3h-2zm-1-4l-1.41-1.41L13 12.17V4h-2v8.17L8.41 9.59 7 11l5 5 5-5z"/>
                </svg>
                Install App
              </button>
              <div v-if="showIOSInstructions" class="px-3 py-2 bg-surface rounded-lg text-xs text-muted leading-relaxed">
                <p class="font-medium text-body mb-1">To install on iOS:</p>
                <ol class="list-decimal list-inside space-y-0.5">
                  <li>Tap the <span class="font-medium">Share</span> button in Safari</li>
                  <li>Scroll down and tap <span class="font-medium">Add to Home Screen</span></li>
                  <li>Tap <span class="font-medium">Add</span></li>
                </ol>
              </div>

              <button
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface text-body text-sm hover:bg-border transition-colors cursor-pointer"
                :disabled="updateChecking"
                @click="forceUpdate"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" :class="updateChecking ? 'animate-spin' : ''">
                  <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
                {{ updateChecking ? 'Checking...' : 'Check for Updates' }}
              </button>

              <button
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface text-red-500 text-sm hover:bg-red-50 transition-colors cursor-pointer"
                @click="resetSettings"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
                Reset Settings
              </button>
            </div>

            <div class="border-t border-border pt-5">
              <h3 class="text-sm font-semibold text-body mb-3">About</h3>
              <p class="text-xs text-muted leading-relaxed mb-4">
                I wanted a Quran player that felt clean and focused, something I could open and immediately start reading or listening. This app pairs each verse with its translation and highlights words in sync with the recitation, so you can follow along naturally.
              </p>
              <div class="flex items-center gap-3 mb-4">
                <img src="/author.jpeg" alt="Muhammad Ibnuh" class="w-10 h-10 rounded-full object-cover shrink-0" />
                <div>
                  <p class="text-sm font-medium text-body">Muhammad Ibnuh</p>
                  <a href="https://ibnuhx.com" target="_blank" rel="noopener noreferrer" class="text-xs text-primary hover:underline">ibnuhx.com</a>
                </div>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <a
                  href="mailto:quran@ibnuhx.com"
                  class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                  quran@ibnuhx.com
                </a>
                <a
                  href="https://x.com/ibnuhx"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  @ibnuhx
                </a>
              </div>

              <div class="mt-4 p-3 bg-surface rounded-lg">
                <div class="flex items-center gap-2 mb-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-primary">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                  <span class="text-xs font-semibold text-body">Open Source</span>
                </div>
                <p class="text-[0.65rem] text-muted leading-relaxed mb-2">
                  This project is open source under the MIT License. Contributions, bug reports, and feature requests are welcome.
                </p>
                <a
                  href="https://github.com/ibnuh/quran"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                >
                  github.com/ibnuh/quran
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                  </svg>
                </a>
              </div>

              <div class="mt-5 pt-4 border-t border-border">
                <h4 class="text-xs font-semibold text-muted mb-3">Powered by</h4>
                <div class="space-y-2.5">
                  <a href="https://alquran.cloud" target="_blank" rel="noopener noreferrer" class="flex items-start gap-2.5 group">
                    <div class="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h14v2H5zm0-4h14v2H5zm0-4h14v2H5z"/></svg>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-body group-hover:text-primary transition-colors">AlQuran Cloud</p>
                      <p class="text-[0.65rem] text-muted">Quran text, translations, per-verse audio</p>
                    </div>
                  </a>
                  <a href="https://quran.com" target="_blank" rel="noopener noreferrer" class="flex items-start gap-2.5 group">
                    <div class="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v9.28a4.39 4.39 0 00-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/></svg>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-body group-hover:text-primary transition-colors">Quran.com / QDC</p>
                      <p class="text-[0.65rem] text-muted">Full surah audio, word-level timing</p>
                    </div>
                  </a>
                  <a href="https://verses.quran.foundation" target="_blank" rel="noopener noreferrer" class="flex items-start gap-2.5 group">
                    <div class="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"/></svg>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-body group-hover:text-primary transition-colors">Quran Foundation</p>
                      <p class="text-[0.65rem] text-muted">Uthmanic Hafs font</p>
                    </div>
                  </a>
                  <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" class="flex items-start gap-2.5 group">
                    <div class="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"/></svg>
                    </div>
                    <div>
                      <p class="text-xs font-medium text-body group-hover:text-primary transition-colors">Google Fonts</p>
                      <p class="text-[0.65rem] text-muted">Amiri and Amiri Quran typefaces</p>
                    </div>
                  </a>
                </div>
              </div>

              <p class="mt-4 text-[0.6rem] text-muted/50 text-center tabular-nums">Version <a :href="'https://github.com/ibnuh/quran/commit/' + appVersion" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors">{{ appVersion }}</a></p>
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
