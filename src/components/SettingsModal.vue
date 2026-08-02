<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useFocusTrap } from '../composables/useFocusTrap.js'
import SearchSelect from './SearchSelect.vue'
import ToggleRow from './ToggleRow.vue'
import SURAHS from '../data/surahs.js'
import RECITERS from '../data/reciters.js'
import TRANSLATIONS, { LANGUAGES } from '../data/translations.js'
import { translationHasFootnotes } from '../utils/translationText.js'
import ARABIC_FONTS from '../data/fonts.js'
import THEMES from '../data/themes.js'
import { TAJWEED_RULES, tajweedColor } from '../utils/arabicText.js'
import { t, UI_LOCALES } from '../i18n/index.js'

const store = usePlayerStore()
const uiLanguageOptions = UI_LOCALES.map(l => ({ value: l.code, label: l.name }))
const emit = defineEmits(['close'])
const panelRef = ref(null)
useFocusTrap(panelRef, { onEscape: () => emit('close'), autoFocus: false })

const activeTab = ref('playback')
const TABS = [
  { id: 'playback', labelKey: 'settings.tabPlayback' },
  { id: 'display', labelKey: 'settings.tabDisplay' },
  { id: 'reading', labelKey: 'settings.tabReading' },
  { id: 'app', labelKey: 'settings.tabApp' }
]

function selectTab(id) {
  activeTab.value = id
}

function onTabKeydown(event, index) {
  let next = index
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    next = (index + 1) % TABS.length
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    next = (index - 1 + TABS.length) % TABS.length
  } else if (event.key === 'Home') {
    next = 0
  } else if (event.key === 'End') {
    next = TABS.length - 1
  } else {
    return
  }
  event.preventDefault()
  activeTab.value = TABS[next].id
  const tabs = panelRef.value?.querySelectorAll('[role="tab"]')
  if (tabs && tabs[next]) {
    tabs[next].focus()
  }
}

const appVersion = __APP_VERSION__

// Install app - read from global prompt captured in main.js
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone
const showIOSInstructions = ref(false)
const canInstall = ref(!!window.__pwaInstallPrompt)

async function installApp() {
  const prompt = window.__pwaInstallPrompt
  if (prompt) {
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    // Prompt is consumed after use regardless of outcome
    window.__pwaInstallPrompt = null
    canInstall.value = false
  } else if (isIOS) {
    showIOSInstructions.value = !showIOSInstructions.value
  }
}

// Force update
const updateChecking = ref(false)
const updateAvailable = ref(false)
const updateStatus = ref('')

async function forceUpdate() {
  updateChecking.value = true
  updateStatus.value = ''
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration) {
      await registration.update()
      // update() may leave the new worker in installing; wait briefly for waiting.
      let waiting = registration.waiting
      if (!waiting && registration.installing) {
        waiting = await new Promise(resolve => {
          const worker = registration.installing
          if (!worker) {
            resolve(null)
            return
          }
          const onState = () => {
            if (worker.state === 'installed') {
              worker.removeEventListener('statechange', onState)
              resolve(registration.waiting || worker)
            } else if (worker.state === 'redundant') {
              worker.removeEventListener('statechange', onState)
              resolve(null)
            }
          }
          worker.addEventListener('statechange', onState)
          setTimeout(() => {
            worker.removeEventListener('statechange', onState)
            resolve(registration.waiting)
          }, 5000)
        })
      }

      if (waiting) {
        updateAvailable.value = true
        updateStatus.value = t('settings.updateFound')
        const { clearAudioRuntimeCaches, markSwJustUpdated } = await import(
          '../utils/swAudio.js'
        )
        markSwJustUpdated()
        await clearAudioRuntimeCaches()
        const reloadOnce = () => {
          window.location.reload()
        }
        navigator.serviceWorker?.addEventListener('controllerchange', reloadOnce, {
          once: true
        })
        waiting.postMessage({ type: 'SKIP_WAITING' })
        // Fallback reload if an older SW without clientsClaim never fires controllerchange.
        setTimeout(reloadOnce, 2000)
        return
      }
    }
    updateChecking.value = false
    updateStatus.value = t('settings.upToDate')
    setTimeout(() => {
      updateStatus.value = ''
    }, 3000)
  } catch (e) {
    updateChecking.value = false
    updateStatus.value = t('settings.upToDate')
    setTimeout(() => {
      updateStatus.value = ''
    }, 3000)
  }
}

// Reset settings
function resetSettings() {
  if (confirm(t('settings.resetConfirm'))) {
    localStorage.removeItem('quran-player-prefs')
    localStorage.removeItem('quran-tip-dismissed')
    localStorage.removeItem('quran-pwa-install-dismissed')
    localStorage.removeItem('quran-footnotes-announced')
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
  SURAHS.map(s => ({
    value: s.number,
    label: `${s.number}. ${s.englishName} - ${s.englishNameTranslation}`
  }))
)
const reciterOptions = computed(() => RECITERS.map(r => ({ value: r.id, label: r.name })))
const languageOptions = computed(() =>
  LANGUAGES.filter(l => TRANSLATIONS.some(t => t.language === l.code)).map(l => ({
    value: l.code,
    label: l.name
  }))
)
const footnotesBadge = computed(() => t('settings.footnotesBadge'))

const translationOptions = computed(() =>
  TRANSLATIONS.filter(tr => tr.language === selectedLanguage.value).map(tr => ({
    value: tr.identifier,
    label: tr.englishName,
    badge: translationHasFootnotes(tr.identifier) ? footnotesBadge.value : ''
  }))
)
// Extra translations are alquran.cloud editions (quran.com qdc.* are excluded), and
// exclude the current primary and any already added.
const extraTranslationOptions = computed(() =>
  TRANSLATIONS.filter(
    tr =>
      !tr.identifier.startsWith('qdc.') &&
      tr.identifier !== store.currentTranslation &&
      !store.extraTranslations.includes(tr.identifier)
  ).map(tr => ({
    value: tr.identifier,
    label: `${tr.englishName} (${tr.language})`,
    badge: translationHasFootnotes(tr.identifier) ? footnotesBadge.value : ''
  }))
)

const currentTranslationHasFootnotes = computed(() =>
  translationHasFootnotes(store.currentTranslation)
)
const extraTranslationChips = computed(() =>
  store.extraTranslations.map(id => {
    const t = TRANSLATIONS.find(x => x.identifier === id)
    return { id, label: t ? t.englishName : id }
  })
)

const storageText = ref('')
async function updateStorage() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage } = await navigator.storage.estimate()
      if (usage != null) {
        storageText.value = (usage / 1048576).toFixed(1) + ' MB used'
      }
    }
  } catch {
    storageText.value = ''
  }
}
onMounted(updateStorage)

function toggleDownload() {
  if (store.isCurrentDownloaded) {
    store.removeDownload(store.currentSurahNum)
  } else {
    store.downloadCurrentSurah().then(updateStorage)
  }
}
// The Madani mushaf glyph font (QCF) is offered as an entry in the same dropdown rather
// than a separate toggle: picking it turns on mushaf mode, picking any real font turns it
// off. QCF_FONT_VALUE is a sentinel, not a real font id.
const QCF_FONT_VALUE = '__qcf__'
const fontOptions = computed(() => [
  ...ARABIC_FONTS.map(f => ({ value: f.id, label: `${f.name} - ${f.description}` })),
  { value: QCF_FONT_VALUE, label: t('settings.mushafFontOption') }
])
const selectedFont = computed(() => (store.mushafMode ? QCF_FONT_VALUE : store.arabicFont))
function onFontChange(value) {
  if (value === QCF_FONT_VALUE) {
    store.setMushafMode(true)
  } else {
    if (store.mushafMode) {
      store.setMushafMode(false)
    }
    store.setArabicFont(value)
  }
}

const HIGHLIGHT_STYLES = [
  { value: 'glow', label: 'Glow' },
  { value: 'background', label: 'Background' },
  { value: 'underline', label: 'Underline' },
  { value: 'sweep', label: 'Sweep' },
  { value: 'flow', label: 'Flow' },
  { value: 'minimal', label: 'Minimal' }
]
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const VERSE_ACTIONS = [
  { key: 'tafsir', labelKey: 'settings.actionTafsir' },
  { key: 'bookmark', labelKey: 'settings.actionBookmark' },
  { key: 'share', labelKey: 'settings.actionShare' },
  { key: 'copy', labelKey: 'settings.actionCopy' }
]
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
</script>

<template>
  <Transition name="settings-panel" appear>
    <div
      class="fixed top-0 right-0 bottom-0 left-0 z-50 flex justify-start"
      role="dialog"
      :aria-label="$t('settings.title')"
      aria-modal="true"
    >
      <div
        class="absolute top-0 right-0 bottom-0 left-0 bg-black/40"
        role="presentation"
        @click="emit('close')"
      ></div>

      <div ref="panelRef" class="relative w-full sm:max-w-sm h-full shadow-2xl">
        <div
          class="bg-card h-full overflow-y-auto scrollable"
          style="padding-left: env(safe-area-inset-left, 0px)"
        >
          <div
            class="sticky top-0 bg-card z-10 border-b border-border"
            style="padding-top: max(1rem, env(safe-area-inset-top, 0px))"
          >
            <div class="flex items-center justify-between px-5 pb-3">
              <h2 class="text-base font-semibold text-body">{{ $t('settings.title') }}</h2>
              <button
                class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface transition-colors text-muted cursor-pointer"
                :aria-label="$t('settings.close')"
                @click="emit('close')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  />
                </svg>
              </button>
            </div>
            <div
              role="tablist"
              :aria-label="$t('settings.title')"
              class="flex gap-0.5 px-3 overflow-x-auto"
            >
              <button
                v-for="(tab, index) in TABS"
                :id="'settings-tab-' + tab.id"
                :key="tab.id"
                type="button"
                role="tab"
                class="flex-1 min-w-0 px-2 py-2.5 text-xs font-medium text-center border-b-2 transition-colors cursor-pointer whitespace-nowrap"
                :class="
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-body'
                "
                :aria-selected="activeTab === tab.id"
                :aria-controls="'settings-panel-' + tab.id"
                :tabindex="activeTab === tab.id ? 0 : -1"
                @click="selectTab(tab.id)"
                @keydown="onTabKeydown($event, index)"
              >
                {{ $t(tab.labelKey) }}
              </button>
            </div>
          </div>

          <div class="p-5">
            <!-- Playback -->
            <div
              v-show="activeTab === 'playback'"
              id="settings-panel-playback"
              role="tabpanel"
              aria-labelledby="settings-tab-playback"
              class="space-y-5"
            >
              <div>
                <label class="block text-sm font-medium text-muted mb-1.5">{{
                  $t('settings.surah')
                }}</label>
                <SearchSelect
                  :model-value="store.currentSurahNum"
                  :options="surahOptions"
                  :placeholder="$t('settings.searchSurah')"
                  @update:model-value="store.setSurah($event)"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-muted mb-1.5">{{
                  $t('settings.reciter')
                }}</label>
                <SearchSelect
                  :model-value="store.currentReciter"
                  :options="reciterOptions"
                  :placeholder="$t('settings.searchReciter')"
                  @update:model-value="store.setReciter($event)"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-muted mb-1.5">{{
                  $t('settings.translationLanguage')
                }}</label>
                <SearchSelect
                  :model-value="selectedLanguage"
                  :options="languageOptions"
                  :placeholder="$t('settings.searchTranslation')"
                  @update:model-value="onLanguageChange($event)"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-muted mb-1.5">{{
                  $t('settings.translation')
                }}</label>
                <SearchSelect
                  :model-value="store.currentTranslation"
                  :options="translationOptions"
                  :placeholder="$t('settings.searchTranslation')"
                  @update:model-value="store.setTranslation($event)"
                />
                <p
                  v-if="currentTranslationHasFootnotes"
                  class="text-xs text-muted mt-1.5 leading-relaxed"
                >
                  {{ $t('settings.footnotesAvailableHint') }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-muted mb-1.5">{{
                  $t('settings.additionalTranslations')
                }}</label>
                <SearchSelect
                  :model-value="null"
                  :options="extraTranslationOptions"
                  :placeholder="$t('settings.addTranslation')"
                  @update:model-value="store.addExtraTranslation($event)"
                />
                <div v-if="extraTranslationChips.length" class="flex flex-wrap gap-1.5 mt-2">
                  <span
                    v-for="chip in extraTranslationChips"
                    :key="chip.id"
                    class="inline-flex items-center gap-1 text-xs bg-surface border border-border rounded-full pl-2.5 pr-1 py-1 text-body"
                  >
                    {{ chip.label }}
                    <button
                      class="w-4 h-4 rounded-full flex items-center justify-center hover:bg-border text-muted cursor-pointer"
                      :aria-label="'Remove ' + chip.label"
                      @click="store.removeExtraTranslation(chip.id)"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path
                          d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        />
                      </svg>
                    </button>
                  </span>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-muted mb-3">{{
                  $t('settings.playbackSpeed')
                }}</label>
                <div class="flex gap-1.5">
                  <button
                    v-for="s in SPEEDS"
                    :key="s"
                    class="flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    :class="
                      store.playbackSpeed === s
                        ? 'bg-primary text-white'
                        : 'bg-surface text-body hover:bg-border'
                    "
                    @click="store.setPlaybackSpeed(s)"
                  >
                    {{ s }}x
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-muted mb-3">{{
                  $t('settings.repeatMode')
                }}</label>
                <div class="flex gap-1.5">
                  <button
                    v-for="mode in REPEAT_MODES"
                    :key="mode.value"
                    class="flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    :class="
                      store.repeatMode === mode.value
                        ? 'bg-primary text-white'
                        : 'bg-surface text-body hover:bg-border'
                    "
                    @click="store.setRepeatMode(mode.value)"
                  >
                    {{ $t('repeatModes.' + mode.value) }}
                  </button>
                </div>
              </div>

              <div class="space-y-4">
                <ToggleRow
                  :label="$t('settings.wordHighlight')"
                  :hint="$t('settings.wordHighlightHint')"
                  :model-value="store.wordHighlight"
                  :disabled="store.playbackMode === 'verse'"
                  :disabled-reason="$t('settings.wordHighlightHintVerse')"
                  @update:model-value="store.setWordHighlight($event)"
                />
                <div v-if="store.wordHighlight && store.playbackMode !== 'verse'">
                  <label class="block text-sm font-medium text-muted mb-2">{{
                    $t('settings.highlightStyle')
                  }}</label>
                  <div class="grid grid-cols-3 gap-1.5">
                    <button
                      v-for="style in HIGHLIGHT_STYLES"
                      :key="style.value"
                      class="py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      :class="
                        store.highlightStyle === style.value
                          ? 'bg-primary text-white'
                          : 'bg-surface text-body hover:bg-border'
                      "
                      @click="store.setHighlightStyle(style.value)"
                    >
                      {{ style.label }}
                    </button>
                  </div>
                </div>
                <ToggleRow
                  :label="$t('settings.autoHideDuringPlayback')"
                  :model-value="store.autoHideControls"
                  @update:model-value="store.setAutoHideControls($event)"
                />
              </div>
            </div>

            <!-- Display -->
            <div
              v-show="activeTab === 'display'"
              id="settings-panel-display"
              role="tabpanel"
              aria-labelledby="settings-tab-display"
              class="space-y-5"
            >
              <div>
                <label class="block text-sm font-medium text-muted mb-1.5">{{
                  $t('settings.arabicFont')
                }}</label>
                <SearchSelect
                  :model-value="selectedFont"
                  :options="fontOptions"
                  :placeholder="$t('settings.searchFont')"
                  @update:model-value="onFontChange($event)"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-muted mb-3">{{
                  $t('settings.arabicFontSize')
                }}</label>
                <div class="flex items-center gap-3">
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
                  <span class="font-arabic text-body w-12 text-right text-sm">{{
                    store.arabicFontSize.toFixed(1)
                  }}</span>
                </div>
                <p
                  class="text-arabic mt-2"
                  dir="rtl"
                  lang="ar"
                  :style="{
                    fontFamily: store.arabicFontFamily,
                    fontSize: Math.min(store.arabicFontSize, 2.5) + 'rem',
                    lineHeight: 2
                  }"
                >
                  بِسْمِ اللَّهِ
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-muted mb-3">{{
                  $t('settings.translationFontSize')
                }}</label>
                <div class="flex items-center gap-3">
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
                  <span class="text-body w-12 text-right text-sm">{{
                    store.translationFontSize.toFixed(1)
                  }}</span>
                </div>
                <p
                  class="text-muted font-light mt-2"
                  :style="{ fontSize: store.translationFontSize + 'rem' }"
                >
                  In the name of God
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-muted mb-3">{{
                  $t('settings.contentWidth')
                }}</label>
                <div class="flex items-center gap-3">
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
                  <span class="text-body w-12 text-right text-sm">{{ store.contentWidth }}</span>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-muted mb-3">{{
                  $t('settings.theme')
                }}</label>
                <div class="grid grid-cols-5 gap-2 gap-y-3">
                  <button
                    class="theme-swatch flex flex-col items-center gap-1.5 p-2 rounded-lg cursor-pointer"
                    :class="
                      store.theme === 'auto'
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'hover:bg-surface'
                    "
                    :aria-label="$t('header.selectTheme', { name: $t('header.auto') })"
                    @click="store.setTheme('auto')"
                  >
                    <span
                      class="w-8 h-8 rounded-full border-2 overflow-hidden flex"
                      style="border-color: var(--color-primary)"
                    >
                      <span class="w-1/2 h-full" style="background: #f8f6f1"></span>
                      <span class="w-1/2 h-full" style="background: #121212"></span>
                    </span>
                    <span class="text-[0.65rem] text-body">{{ $t('header.auto') }}</span>
                  </button>
                  <button
                    v-for="theme in THEMES"
                    :key="theme.id"
                    class="theme-swatch flex flex-col items-center gap-1.5 p-2 rounded-lg cursor-pointer"
                    :class="
                      store.theme === theme.id
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'hover:bg-surface'
                    "
                    :aria-label="$t('header.selectTheme', { name: theme.name })"
                    @click="store.setTheme(theme.id)"
                  >
                    <span
                      class="w-8 h-8 rounded-full border-2"
                      :style="{
                        background: theme.colors.surface,
                        borderColor: theme.colors.primary
                      }"
                    ></span>
                    <span class="text-[0.65rem] text-body">{{ theme.name }}</span>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-muted mb-1.5">{{
                  $t('settings.uiLanguage')
                }}</label>
                <SearchSelect
                  :model-value="store.uiLanguage"
                  :options="uiLanguageOptions"
                  :placeholder="$t('settings.uiLanguage')"
                  @update:model-value="store.setUiLanguage($event)"
                />
              </div>

              <div class="space-y-4">
                <ToggleRow
                  :label="$t('settings.animations')"
                  :hint="$t('settings.animationsHint')"
                  :model-value="store.animations"
                  @update:model-value="store.setAnimations($event)"
                />
                <ToggleRow
                  label-class="text-sm text-body"
                  :label="$t('settings.justify')"
                  :hint="$t('settings.justifyHint')"
                  :model-value="store.justifyText"
                  :disabled="store.mushafMode"
                  :disabled-reason="$t('settings.justifyUnavailableQcf')"
                  @update:model-value="store.setJustifyText($event)"
                />
                <ToggleRow
                  label-class="text-sm text-body"
                  :label="$t('settings.endOrnament')"
                  :hint="$t('settings.endOrnamentHint')"
                  :model-value="store.verseEndOrnament"
                  :disabled="store.mushafMode"
                  :disabled-reason="$t('settings.endOrnamentUnavailableQcf')"
                  @update:model-value="store.setVerseEndOrnament($event)"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-muted mb-1">{{
                  $t('settings.verseButtons')
                }}</label>
                <p class="text-xs text-muted/60 mb-3">{{ $t('settings.verseButtonsHint') }}</p>
                <div class="space-y-3">
                  <label
                    v-for="action in VERSE_ACTIONS"
                    :key="action.key"
                    class="flex items-center justify-between cursor-pointer"
                  >
                    <span class="text-sm text-body">{{ $t(action.labelKey) }}</span>
                    <input
                      type="checkbox"
                      :checked="store.verseActions[action.key]"
                      class="toggle-switch"
                      @change="store.setVerseAction(action.key, $event.target.checked)"
                    />
                  </label>
                </div>
              </div>
            </div>

            <!-- Reading -->
            <div
              v-show="activeTab === 'reading'"
              id="settings-panel-reading"
              role="tabpanel"
              aria-labelledby="settings-tab-reading"
              class="space-y-5"
            >
              <ToggleRow
                :label="$t('settings.readMode')"
                :hint="$t('settings.readModeHint')"
                :model-value="store.readMode"
                @update:model-value="store.setReadMode($event)"
              />

              <!-- Layout is independent of Read/Listen so readers can keep a centered verse. -->
              <div>
                <label class="block text-sm font-medium text-muted mb-1">{{
                  $t('settings.readingLayout')
                }}</label>
                <p class="text-xs text-muted/60 mb-2">{{ $t('settings.readingLayoutHint') }}</p>
                <div class="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    class="py-2 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    :class="
                      !store.readingMode
                        ? 'bg-primary text-white'
                        : 'bg-surface text-body hover:bg-border'
                    "
                    @click="store.setReadingMode(false)"
                  >
                    {{ $t('settings.layoutSingle') }}
                  </button>
                  <button
                    type="button"
                    class="py-2 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    :class="
                      store.readingMode
                        ? 'bg-primary text-white'
                        : 'bg-surface text-body hover:bg-border'
                    "
                    @click="store.setReadingMode(true)"
                  >
                    {{ $t('settings.layoutContinuous') }}
                  </button>
                </div>
              </div>

              <ToggleRow
                :label="$t('settings.footnotes')"
                :hint="$t('settings.footnotesHint')"
                :model-value="store.showFootnotes"
                @update:model-value="store.setShowFootnotes($event)"
              />

              <!-- Tajweed colors are letter-level; the mushaf (QCF) font renders whole-word
                   glyphs, so the two cannot combine. Show it disabled, not hidden. -->
              <div class="space-y-3">
                <ToggleRow
                  label-class="text-sm text-body"
                  :label="$t('settings.tajweed')"
                  :hint="$t('settings.tajweedHint')"
                  :model-value="store.tajweed"
                  :disabled="store.mushafMode"
                  :disabled-reason="$t('settings.tajweedUnavailableQcf')"
                  @update:model-value="store.setTajweed($event)"
                />
                <div
                  v-if="store.tajweed && !store.mushafMode"
                  class="flex flex-wrap gap-x-3 gap-y-1.5 pt-1"
                >
                  <span
                    v-for="rule in TAJWEED_RULES"
                    :key="rule.key"
                    class="inline-flex items-center gap-1.5 text-[0.7rem] text-muted"
                  >
                    <span
                      class="w-2.5 h-2.5 rounded-full"
                      :style="{ background: tajweedColor(rule.key) }"
                    ></span>
                    {{ rule.label }}
                  </span>
                </div>
              </div>
            </div>

            <!-- App -->
            <div
              v-show="activeTab === 'app'"
              id="settings-panel-app"
              role="tabpanel"
              aria-labelledby="settings-tab-app"
              class="space-y-5"
            >
              <div class="space-y-2">
                <button
                  class="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:opacity-60"
                  :class="
                    store.isCurrentDownloaded
                      ? 'bg-primary/10 text-primary'
                      : 'bg-surface text-body hover:bg-border'
                  "
                  :disabled="store.downloadingSurah !== null || !store.totalVerses"
                  @click="toggleDownload"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      v-if="store.isCurrentDownloaded"
                      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    />
                    <path v-else d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                  </svg>
                  {{
                    store.downloadingSurah === store.currentSurahNum
                      ? $t('settings.downloading')
                      : store.isCurrentDownloaded
                        ? $t('settings.downloaded')
                        : $t('settings.download')
                  }}
                </button>
                <p v-if="store.downloadError" class="text-xs text-red-500 text-center">
                  {{ $t('settings.downloadFailed') }}
                </p>
                <p
                  v-if="storageText || store.downloadedSurahs.length"
                  class="text-xs text-muted text-center"
                >
                  {{ $t('settings.surahsSaved', { count: store.downloadedSurahs.length })
                  }}<span v-if="storageText"> · {{ storageText }}</span>
                </p>
              </div>

              <div class="space-y-2">
                <button
                  v-if="canInstall || (isIOS && !isStandalone)"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                  @click="installApp"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3h-2zm-1-4l-1.41-1.41L13 12.17V4h-2v8.17L8.41 9.59 7 11l5 5 5-5z"
                    />
                  </svg>
                  {{ $t('settings.install') }}
                </button>
                <div
                  v-if="showIOSInstructions"
                  class="px-3 py-2 bg-surface rounded-lg text-xs text-muted leading-relaxed"
                >
                  <p class="font-medium text-body mb-1">{{ $t('settings.iosInstallTitle') }}</p>
                  <ol class="list-decimal list-inside space-y-0.5">
                    <li>Tap the <span class="font-medium">Share</span> button in Safari</li>
                    <li>
                      Scroll down and tap <span class="font-medium">Add to Home Screen</span>
                    </li>
                    <li>Tap <span class="font-medium">Add</span></li>
                  </ol>
                </div>

                <button
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface text-body text-sm hover:bg-border transition-colors cursor-pointer"
                  :disabled="updateChecking"
                  @click="forceUpdate"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    :class="updateChecking ? 'animate-spin' : ''"
                  >
                    <path
                      d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                    />
                  </svg>
                  {{
                    updateChecking
                      ? $t('settings.checking')
                      : updateStatus || $t('settings.checkUpdates')
                  }}
                </button>

                <button
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface text-red-500 text-sm hover:bg-red-50 transition-colors cursor-pointer"
                  @click="resetSettings"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
                    />
                  </svg>
                  {{ $t('settings.reset') }}
                </button>
              </div>

              <div>
                <h3 class="text-sm font-semibold text-body mb-3">{{ $t('settings.about') }}</h3>
                <p class="text-xs text-muted leading-relaxed mb-4">
                  I wanted a Quran player that felt clean and focused, something I could open and
                  immediately start reading or listening. This app pairs each verse with its
                  translation and highlights words in sync with the recitation, so you can follow
                  along naturally.
                </p>
                <div class="flex items-center gap-3 mb-4">
                  <img
                    src="/author.jpeg"
                    alt="Muhammad Ibnuh"
                    class="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <div>
                    <p class="text-sm font-medium text-body">Muhammad Ibnuh</p>
                    <a
                      href="https://ibnuhx.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-xs text-primary hover:underline"
                      >ibnuhx.com</a
                    >
                  </div>
                </div>
                <div class="flex items-center gap-3 flex-wrap">
                  <a
                    href="mailto:quran@ibnuhx.com"
                    class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path
                        d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                      />
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
                      <path
                        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                      />
                    </svg>
                    @ibnuhx
                  </a>
                </div>

                <div class="mt-4 p-3 bg-surface rounded-lg">
                  <div class="flex items-center gap-2 mb-1.5">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      class="text-primary"
                    >
                      <path
                        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                      />
                    </svg>
                    <span class="text-xs font-semibold text-body">Open Source</span>
                  </div>
                  <p class="text-[0.65rem] text-muted leading-relaxed mb-2">
                    This project is open source under the MIT License. Contributions, bug reports,
                    and feature requests are welcome.
                  </p>
                  <a
                    href="https://github.com/ibnuh/quran"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                  >
                    github.com/ibnuh/quran
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path
                        d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"
                      />
                    </svg>
                  </a>
                </div>

                <div class="mt-5 pt-4 border-t border-border">
                  <h4 class="text-xs font-semibold text-muted mb-3">Powered by</h4>
                  <div class="space-y-2.5">
                    <a
                      href="https://alquran.cloud"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-start gap-2.5 group"
                    >
                      <div
                        class="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path
                            d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h14v2H5zm0-4h14v2H5zm0-4h14v2H5z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p
                          class="text-xs font-medium text-body group-hover:text-primary transition-colors"
                        >
                          AlQuran Cloud
                        </p>
                        <p class="text-[0.65rem] text-muted">
                          Quran text, translations, per-verse audio
                        </p>
                      </div>
                    </a>
                    <a
                      href="https://quran.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-start gap-2.5 group"
                    >
                      <div
                        class="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path
                            d="M12 3v9.28a4.39 4.39 0 00-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p
                          class="text-xs font-medium text-body group-hover:text-primary transition-colors"
                        >
                          Quran.com / QDC
                        </p>
                        <p class="text-[0.65rem] text-muted">Full surah audio, word-level timing</p>
                      </div>
                    </a>
                    <a
                      href="https://verses.quran.foundation"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-start gap-2.5 group"
                    >
                      <div
                        class="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path
                            d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p
                          class="text-xs font-medium text-body group-hover:text-primary transition-colors"
                        >
                          Quran Foundation
                        </p>
                        <p class="text-[0.65rem] text-muted">Uthmanic Hafs font</p>
                      </div>
                    </a>
                    <a
                      href="https://fonts.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-start gap-2.5 group"
                    >
                      <div
                        class="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path
                            d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p
                          class="text-xs font-medium text-body group-hover:text-primary transition-colors"
                        >
                          Google Fonts
                        </p>
                        <p class="text-[0.65rem] text-muted">Amiri and Amiri Quran typefaces</p>
                      </div>
                    </a>
                  </div>
                </div>

                <p class="mt-4 text-[0.6rem] text-muted/50 text-center tabular-nums">
                  Version
                  <a
                    :href="'https://github.com/ibnuh/quran/commit/' + appVersion"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:text-primary transition-colors"
                    >{{ appVersion }}</a
                  >
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.theme-swatch {
  transition:
    background 0.2s cubic-bezier(0.25, 1, 0.5, 1),
    box-shadow 0.25s cubic-bezier(0.25, 1, 0.5, 1);
}
.theme-swatch:active {
  transform: scale(0.95);
}

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

@media (pointer: coarse) {
  .range-field {
    height: 8px;
    border-radius: 4px;
  }
  .range-field::-webkit-slider-thumb {
    width: 24px;
    height: 24px;
  }
  .range-field::-moz-range-thumb {
    width: 24px;
    height: 24px;
  }
}

.settings-panel-enter-active {
  transition: opacity 0.25s cubic-bezier(0.25, 1, 0.5, 1);
}
.settings-panel-leave-active {
  transition: opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.settings-panel-enter-active > :last-child {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.settings-panel-leave-active > :last-child {
  transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
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
