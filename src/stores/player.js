import { defineStore } from 'pinia'
import {
  fetchSurahText,
  fetchSurahTextQuranCom,
  fetchSurahAudio,
  fetchVerseAudio,
  fetchSurahTajweed,
  fetchSurahQcf,
  fetchTranslations,
  getCachedSurah,
  cacheSurah
} from '../services/api.js'
import { parseTajweed } from '../utils/arabicText.js'
import { resolveTranslationSource } from '../utils/translationText.js'
import { ensureQcfPageFont } from '../utils/qcfFonts.js'
import { setUiLocale, t } from '../i18n/index.js'
import {
  STORAGE_KEY,
  PREFS_VERSION,
  TOTAL_SURAHS,
  SAVE_PREFS_DEBOUNCE,
  SPEEDS,
  AUDIO_RUNTIME_CACHE_NAMES,
  getResponsiveDefaults,
  isAllowedAudioUrl,
  filterAllowedAudioUrls
} from '../config.js'
import SURAHS from '../data/surahs.js'
import RECITERS from '../data/reciters.js'
import ARABIC_FONTS, { getFontMetrics } from '../data/fonts.js'
import TRANSLATIONS from '../data/translations.js'
import THEMES, { applyThemeToDocument } from '../data/themes.js'
import JUZS, { getJuzForVerse } from '../data/juzs.js'
import TAFSIRS from '../data/tafsirs.js'

let autoThemeListenerBound = false
let savePrefsTimer = null
let prefsFlushStore = null
let prefsFlushListenersBound = false

const HIGHLIGHT_STYLES = new Set(['glow', 'background', 'underline', 'minimal', 'sweep', 'flow'])
const MIN_PLAYBACK_SPEED = Math.min(...SPEEDS)
const MAX_PLAYBACK_SPEED = Math.max(...SPEEDS)
const REPEAT_MODES = new Set(['none', 'verse', 'surah'])
const TRANSLATION_IDS = new Set(TRANSLATIONS.map(t => t.identifier))
const TAFSIR_IDS = new Set(TAFSIRS.map(t => t.id))

function flushPendingPreferences() {
  // Only flush when a debounced write is actually pending. Always writing on
  // pagehide would overwrite localStorage that tests (or other tabs) just set
  // before a reload, clobbering the intended prefs.
  if (!savePrefsTimer) {
    return
  }
  clearTimeout(savePrefsTimer)
  savePrefsTimer = null
  if (prefsFlushStore) {
    prefsFlushStore.writePreferencesNow()
  }
}

function ensurePrefsFlushListeners(store) {
  prefsFlushStore = store
  if (prefsFlushListenersBound || typeof window === 'undefined') {
    return
  }
  prefsFlushListenersBound = true
  window.addEventListener('pagehide', flushPendingPreferences)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingPreferences()
    }
  })
}

function detectTranslationFromLocale() {
  const locales = navigator.languages || [navigator.language || 'en']
  for (const locale of locales) {
    const lang = locale.split('-')[0].toLowerCase()
    const match = TRANSLATIONS.find(t => t.language === lang)
    if (match) {
      return match.identifier
    }
  }
  return 'en.itani'
}

// Map a thrown ApiError to a user-facing, actionable message.
function errorMessageFor(err, { isAudio = false } = {}) {
  const kind = err?.kind
  if (kind === 'not-found') {
    return isAudio ? t('errors.notFoundAudio') : t('errors.notFoundText')
  }
  if (kind === 'network') {
    return t('errors.network')
  }
  if (kind === 'invalid' || kind === 'http') {
    return isAudio ? t('errors.invalidAudio') : t('errors.invalidText')
  }
  return t('errors.generic')
}

// Versioned migrators run in order from the stored version up to PREFS_VERSION.
// Key is the version being migrated *from*.
const PREFS_MIGRATORS = {
  // v1 -> v2: reciter was stored as a numeric cdnId (also handled in normalize).
  1: prefs => {
    const out = { ...prefs }
    if (typeof out.reciter === 'number') {
      const found = RECITERS.find(r => r.cdnId === out.reciter)
      out.reciter = found ? found.id : undefined
    }
    return out
  }
}

function migratePrefs(raw) {
  let version = typeof raw?.version === 'number' && raw.version > 0 ? raw.version : 1
  let prefs = { ...raw }
  while (version < PREFS_VERSION) {
    const migrate = PREFS_MIGRATORS[version]
    if (typeof migrate === 'function') {
      prefs = migrate(prefs) || prefs
    }
    version += 1
  }
  prefs.version = PREFS_VERSION
  return prefs
}

function isValidBookmark(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    typeof entry.surahNum === 'number' &&
    entry.surahNum >= 1 &&
    entry.surahNum <= TOTAL_SURAHS &&
    typeof entry.verseIndex === 'number' &&
    entry.verseIndex >= 0 &&
    Number.isFinite(entry.verseIndex)
  )
}

// Validate persisted preferences, dropping values that no longer reference valid
// reciters/themes/fonts/surahs so the store can fall back to defaults.
function normalizePrefs(prefs) {
  const out = { ...prefs }
  // Legacy safety: numeric reciter may still appear on unversioned payloads.
  if (typeof out.reciter === 'number') {
    const found = RECITERS.find(r => r.cdnId === out.reciter)
    out.reciter = found ? found.id : undefined
  }
  if (out.reciter && !RECITERS.some(r => r.id === out.reciter)) {
    out.reciter = undefined
  }
  if (out.theme && out.theme !== 'auto' && !THEMES.some(t => t.id === out.theme)) {
    out.theme = undefined
  }
  if (out.arabicFont && !ARABIC_FONTS.some(f => f.id === out.arabicFont)) {
    out.arabicFont = undefined
  }
  if (out.surah !== undefined && (out.surah < 1 || out.surah > TOTAL_SURAHS)) {
    out.surah = undefined
  }
  // loadSurah clamps indexes past the end of the surah, but a negative or
  // non-integer index would survive that check and leave currentVerse null.
  if (out.verse !== undefined && (!Number.isInteger(out.verse) || out.verse < 0)) {
    out.verse = undefined
  }
  // Clamp into the supported range: out-of-range rates throw NotSupportedError
  // when applied to the media element on boot.
  if (typeof out.playbackSpeed === 'number' && Number.isFinite(out.playbackSpeed)) {
    out.playbackSpeed = Math.max(
      MIN_PLAYBACK_SPEED,
      Math.min(MAX_PLAYBACK_SPEED, out.playbackSpeed)
    )
  } else {
    out.playbackSpeed = undefined
  }
  if (typeof out.volume === 'number') {
    if (!Number.isFinite(out.volume)) {
      out.volume = undefined
    } else {
      out.volume = Math.max(0, Math.min(1, out.volume))
    }
  } else if (out.volume !== undefined) {
    out.volume = undefined
  }
  if (out.repeatMode && !REPEAT_MODES.has(out.repeatMode)) {
    out.repeatMode = undefined
  }
  if (out.highlightStyle && !HIGHLIGHT_STYLES.has(out.highlightStyle)) {
    out.highlightStyle = undefined
  }
  if (Array.isArray(out.extraTranslations)) {
    out.extraTranslations = out.extraTranslations.filter(
      id => typeof id === 'string' && TRANSLATION_IDS.has(id)
    )
  } else if (out.extraTranslations !== undefined) {
    out.extraTranslations = []
  }
  if (Array.isArray(out.bookmarks)) {
    out.bookmarks = out.bookmarks.filter(isValidBookmark)
  } else if (out.bookmarks !== undefined) {
    out.bookmarks = []
  }
  if (typeof out.tafsirSource === 'number') {
    if (!TAFSIR_IDS.has(out.tafsirSource)) {
      out.tafsirSource = undefined
    }
  } else if (out.tafsirSource !== undefined) {
    out.tafsirSource = undefined
  }
  if (out.translation && !TRANSLATION_IDS.has(out.translation)) {
    // Allow Quran.com numeric ids encoded as strings/numbers via resolve path;
    // only drop clearly invalid non-string/non-number values.
    if (typeof out.translation !== 'string' && typeof out.translation !== 'number') {
      out.translation = undefined
    }
  }
  if (Array.isArray(out.downloadedSurahs)) {
    out.downloadedSurahs = out.downloadedSurahs.filter(
      n => typeof n === 'number' && n >= 1 && n <= TOTAL_SURAHS
    )
  }
  if (Array.isArray(out.recentSurahs)) {
    out.recentSurahs = out.recentSurahs.filter(
      n => typeof n === 'number' && n >= 1 && n <= TOTAL_SURAHS
    )
  }
  return out
}

function sanitizeAudioUrl(url) {
  return isAllowedAudioUrl(url) ? url : null
}

function sanitizeAudioUrls(urls) {
  return filterAllowedAudioUrls(urls)
}

async function putResponseInAudioCaches(url, response) {
  if (typeof caches === 'undefined') {
    return
  }
  const body = response.clone()
  for (const cacheName of AUDIO_RUNTIME_CACHE_NAMES) {
    try {
      const cache = await caches.open(cacheName)
      await cache.put(url, body.clone())
    } catch {
      // Cache put is best-effort (private mode, quota, opaque mismatch).
    }
  }
}

let loadAbortController = null

const _responsiveDefaults = getResponsiveDefaults()
const loadedArabicFontFamilies = new Set()
const pendingArabicFontLoads = new Map()
let latestArabicFontRequestId = 0

async function ensureArabicFontLoaded(fontId) {
  if (typeof document === 'undefined' || !document.fonts) {
    return
  }

  const font = ARABIC_FONTS.find(f => f.id === fontId)
  if (!font) {
    return
  }

  const primaryFamily = font.family.split(',')[0]?.trim()
  if (!primaryFamily) {
    return
  }

  if (loadedArabicFontFamilies.has(primaryFamily)) {
    return
  }

  let loadPromise = pendingArabicFontLoads.get(primaryFamily)
  if (!loadPromise) {
    loadPromise = Promise.race([
      Promise.all([
        document.fonts.load(`400 1em ${primaryFamily}`, 'بِسْمِ'),
        document.fonts.load(`400 2em ${primaryFamily}`, 'الرَّحْمَٰنِ')
      ]),
      new Promise(resolve => setTimeout(resolve, 2500))
    ])
      .then(() => {
        loadedArabicFontFamilies.add(primaryFamily)
      })
      .catch(() => {
        // Ignore font loading failures and fall back to the browser stack.
      })
      .finally(() => {
        pendingArabicFontLoads.delete(primaryFamily)
      })

    pendingArabicFontLoads.set(primaryFamily, loadPromise)
  }

  await loadPromise
}

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentSurahNum: 1,
    currentReciter: 'alafasy',
    currentTranslation: detectTranslationFromLocale(),
    currentVerseIndex: 0,
    verses: [],
    translationVerses: [],
    // Additional translations stacked under the primary one (alquran.cloud edition ids).
    extraTranslations: [],
    extraTranslationVerses: [], // [{ id, name, verses }]
    // Full surah audio (qurancdn.com)
    playbackMode: null, // 'full' | 'verse'
    audioUrl: null,
    audioDurationMs: 0,
    verseTimings: [],
    // Per-verse audio (alquran.cloud fallback)
    audioUrls: [],
    arabicFont: 'amiri-quran',
    arabicFontSize: _responsiveDefaults.arabicFontSize,
    translationFontSize: _responsiveDefaults.translationFontSize,
    contentWidth: _responsiveDefaults.contentWidth,
    theme: 'light',
    uiLanguage: 'en',
    autoHideControls: true,
    currentWordIndex: -1,
    wordHighlight: true,
    highlightStyle: 'flow', // 'glow' | 'background' | 'underline' | 'minimal' | 'sweep' | 'flow'
    // Per-verse action button visibility (under the verse number).
    verseActions: { bookmark: true, share: true, copy: true, tafsir: true },
    tafsirSource: 169, // quran.com tafsir id (default: Ibn Kathir, abridged, en)
    // Show clickable footnote markers in the primary translation (when available).
    showFootnotes: true,
    // Render the traditional end-of-ayah ornament inline instead of the number badge.
    verseEndOrnament: false,
    // Justify the Arabic text block (mushaf style) instead of centering it.
    justifyText: false,
    // Continuous reading layout (all verses scrollable) vs single-verse focus.
    readingMode: false,
    // Read mode: text-first continuous layout, compact player, select without auto-play.
    readMode: false,
    // Soft audio failure: text loaded but playback is unavailable for this surah/reciter.
    audioUnavailable: false,
    // Tajweed coloring (quran.com annotated text); loaded on demand per surah.
    tajweed: false,
    tajweedVerses: [],
    // QCF v2 mushaf glyph rendering (quran.com per-page fonts); loaded per surah.
    mushafMode: false,
    qcfVerses: [],
    repeatMode: 'none', // 'none' | 'verse' | 'surah'
    abRepeat: null, // { start: verseIndex, end: verseIndex } for A-B memorization loop
    playbackSpeed: 1,
    volume: 1,
    animations: true,
    isLoading: false,
    error: null,
    errorKind: null, // 'text' | 'audio' | null
    bookmarks: [],
    recentSurahs: [],
    // Offline downloads: surah numbers explicitly cached for offline use.
    downloadedSurahs: [],
    downloadingSurah: null,
    downloadError: false
  }),

  getters: {
    currentSurah: state => SURAHS.find(s => s.number === state.currentSurahNum),
    currentReciterData: state => RECITERS.find(r => r.id === state.currentReciter),
    currentVerse: state => state.verses[state.currentVerseIndex] || null,
    currentTranslationVerse: state => state.translationVerses[state.currentVerseIndex] || null,
    currentExtraTranslations: state =>
      state.extraTranslationVerses
        .map(t => ({ name: t.name, text: t.verses[state.currentVerseIndex]?.text || '' }))
        .filter(t => t.text),
    totalVerses: state => state.verses.length,
    showBismillah: state =>
      state.currentSurahNum !== 1 && state.currentSurahNum !== 9 && state.currentVerseIndex === 0,
    canPrevVerse: state => state.currentVerseIndex > 0,
    canNextVerse: state => state.currentVerseIndex < state.verses.length - 1,
    canPrevSurah: state => state.currentSurahNum > 1,
    canNextSurah: state => state.currentSurahNum < 114,
    arabicFontFamily: state => {
      const font = ARABIC_FONTS.find(f => f.id === state.arabicFont)
      return font ? font.family : ARABIC_FONTS[0].family
    },
    arabicFontMetrics: state => getFontMetrics(state.arabicFont),
    currentTajweedSegments: state => {
      const raw = state.tajweedVerses[state.currentVerseIndex]
      return raw ? parseTajweed(raw) : []
    },
    currentQcfWords: state => state.qcfVerses[state.currentVerseIndex] || [],
    currentJuz: state => {
      const verse = state.verses[state.currentVerseIndex]
      if (!verse) {
        return 1
      }
      return getJuzForVerse(state.currentSurahNum, verse.number)
    },
    isCurrentBookmarked: state =>
      state.bookmarks.some(
        b => b.surahNum === state.currentSurahNum && b.verseIndex === state.currentVerseIndex
      ),
    isCurrentDownloaded: state => state.downloadedSurahs.includes(state.currentSurahNum),
    // True when the current surah has a playable, allowlisted audio source.
    canPlayAudio: state =>
      !state.audioUnavailable &&
      !!state.playbackMode &&
      (state.playbackMode === 'full' ? !!state.audioUrl : state.audioUrls.length > 0)
  },

  actions: {
    async loadSurah() {
      // Abort any in-flight load
      if (loadAbortController) {
        loadAbortController.abort()
      }
      loadAbortController = new AbortController()
      const signal = loadAbortController.signal

      this.isLoading = true
      this.error = null
      this.errorKind = null
      this.audioUnavailable = false
      this.audioDurationMs = 0
      // Tajweed text, QCF glyphs, and extra translations are surah-specific; reload.
      this.tajweedVerses = []
      this.qcfVerses = []
      this.extraTranslationVerses = []

      const reciter = this.currentReciterData

      // Check cache first
      const cached = getCachedSurah(
        this.currentSurahNum,
        this.currentTranslation,
        this.currentReciter
      )
      if (cached) {
        this.verses = cached.verses
        this.translationVerses = cached.translationVerses
        this.playbackMode = cached.playbackMode
        this.audioUrl = sanitizeAudioUrl(cached.audioUrl)
        this.audioDurationMs =
          Number(cached.audioDurationMs) ||
          Number(cached.verseTimings?.[cached.verseTimings.length - 1]?.timestampTo) ||
          0
        this.verseTimings = cached.verseTimings
        this.audioUrls = sanitizeAudioUrls(cached.audioUrls)
        if (cached.playbackMode === 'full' && !this.audioUrl) {
          this.playbackMode = null
        } else if (cached.playbackMode === 'verse' && !this.audioUrls.length) {
          this.playbackMode = null
        }
        this.audioUnavailable = !this.playbackMode
        if (this.currentVerseIndex >= this.verses.length) {
          this.currentVerseIndex = 0
        }
        this.computeWordCounts()
        this.isLoading = false
        if (this.tajweed) {
          void this.loadTajweed()
        }
        if (this.mushafMode) {
          void this.loadQcf()
        }
        if (this.extraTranslations.length) {
          void this.loadExtraTranslations()
        }
        return
      }

      try {
        const source = resolveTranslationSource(this.currentTranslation)
        // Start the text fetch in parallel; settle to a result/error object so a
        // text rejection never becomes unhandled if audio fails first.
        const textSettled = (
          source.kind === 'qurancom'
            ? fetchSurahTextQuranCom(this.currentSurahNum, source.editionId, signal)
            : fetchSurahText(this.currentSurahNum, source.editionId, signal)
        ).then(
          data => ({ data }),
          error => ({ error })
        )

        // Try full surah audio first, then fall back to per-verse. Audio failure is
        // soft: reading still works without playable audio.
        let audioResult = null
        let audioError = null

        if (reciter?.cdnId) {
          try {
            const data = await fetchSurahAudio(reciter.cdnId, this.currentSurahNum, signal)
            audioResult = {
              mode: 'full',
              audioUrl: data.audioUrl,
              audioDurationMs: data.duration,
              verseTimings: data.verseTimings,
              audioUrls: []
            }
          } catch (e) {
            if (e.name === 'AbortError') {
              throw e
            }
            audioError = e
            // CDN failed, will try per-verse fallback below.
          }
        }

        if (!audioResult && reciter?.cloudId) {
          try {
            const data = await fetchVerseAudio(reciter.cloudId, this.currentSurahNum, signal)
            audioResult = {
              mode: 'verse',
              audioUrl: null,
              audioDurationMs: 0,
              verseTimings: [],
              audioUrls: data.audioUrls
            }
            audioError = null
          } catch (e) {
            if (e.name === 'AbortError') {
              throw e
            }
            audioError = e
          }
        }

        if (!audioResult && !reciter) {
          audioError = new Error('Unknown reciter selected.')
        } else if (!audioResult && reciter && !reciter.cdnId && !reciter.cloudId) {
          audioError = new Error('No audio source available for this reciter.')
        }

        const { data: textData, error: textError } = await textSettled

        if (signal.aborted) {
          return
        }

        // Text is required; audio is optional so pure reading still works offline-ish.
        if (textError) {
          this.error = errorMessageFor(textError, { isAudio: false })
          this.errorKind = 'text'
          return
        }

        this.verses = textData.verses
        this.translationVerses = textData.translationVerses

        if (audioResult) {
          const safeUrl = sanitizeAudioUrl(audioResult.audioUrl)
          const safeUrls = sanitizeAudioUrls(audioResult.audioUrls)
          if (audioResult.mode === 'full' && !safeUrl) {
            this.playbackMode = null
            this.audioUrl = null
            this.audioDurationMs = 0
            this.verseTimings = []
            this.audioUrls = []
            this.audioUnavailable = true
          } else if (audioResult.mode === 'verse' && !safeUrls.length) {
            this.playbackMode = null
            this.audioUrl = null
            this.audioDurationMs = 0
            this.verseTimings = []
            this.audioUrls = []
            this.audioUnavailable = true
          } else {
            this.playbackMode = audioResult.mode
            this.audioUrl = safeUrl
            this.audioDurationMs = Number(audioResult.audioDurationMs) || 0
            this.verseTimings = audioResult.verseTimings
            this.audioUrls = safeUrls
            this.audioUnavailable = false
          }
        } else {
          this.playbackMode = null
          this.audioUrl = null
          this.audioDurationMs = 0
          this.verseTimings = []
          this.audioUrls = []
          this.audioUnavailable = true
          // Keep a soft message available for play attempts; do not block the UI.
          void audioError
        }

        this.errorKind = null

        if (this.currentVerseIndex >= this.verses.length) {
          this.currentVerseIndex = 0
        }
        this.computeWordCounts()

        // Cache the result (including text-only loads so re-entry stays instant).
        cacheSurah(this.currentSurahNum, this.currentTranslation, this.currentReciter, {
          verses: textData.verses,
          translationVerses: textData.translationVerses,
          playbackMode: this.playbackMode,
          audioUrl: this.audioUrl,
          audioDurationMs: this.audioDurationMs,
          verseTimings: this.verseTimings,
          audioUrls: this.audioUrls
        })

        if (this.tajweed) {
          void this.loadTajweed()
        }
        if (this.mushafMode) {
          void this.loadQcf()
        }
        if (this.extraTranslations.length) {
          void this.loadExtraTranslations()
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }
        this.error = errorMessageFor(err)
        this.errorKind = 'text'
      } finally {
        if (!signal.aborted) {
          this.isLoading = false
        }
      }
    },

    // Preload next surah data into cache (no UI state change)
    async preloadNextSurah() {
      if (!this.canNextSurah) {
        return
      }
      const nextNum = this.currentSurahNum + 1
      const reciter = this.currentReciterData
      if (!reciter) {
        return
      }

      const cached = getCachedSurah(nextNum, this.currentTranslation, this.currentReciter)
      if (cached) {
        return
      }

      try {
        const source = resolveTranslationSource(this.currentTranslation)
        const [textData, audioData] = await Promise.all([
          source.kind === 'qurancom'
            ? fetchSurahTextQuranCom(nextNum, source.editionId)
            : fetchSurahText(nextNum, source.editionId),
          reciter.cdnId
            ? fetchSurahAudio(reciter.cdnId, nextNum).catch(() => null)
            : Promise.resolve(null)
        ])

        let audioResult
        if (audioData) {
          const safeUrl = sanitizeAudioUrl(audioData.audioUrl)
          if (!safeUrl) {
            return
          }
          audioResult = {
            playbackMode: 'full',
            audioUrl: safeUrl,
            audioDurationMs: audioData.duration,
            verseTimings: audioData.verseTimings,
            audioUrls: []
          }
        } else if (reciter.cloudId) {
          const verseData = await fetchVerseAudio(reciter.cloudId, nextNum)
          const safeUrls = sanitizeAudioUrls(verseData.audioUrls)
          if (!safeUrls.length) {
            return
          }
          audioResult = {
            playbackMode: 'verse',
            audioUrl: null,
            audioDurationMs: 0,
            verseTimings: [],
            audioUrls: safeUrls
          }
        } else {
          return
        }

        cacheSurah(nextNum, this.currentTranslation, this.currentReciter, {
          verses: textData.verses,
          translationVerses: textData.translationVerses,
          ...audioResult
        })
      } catch {
        // Preload failure is silent
      }
    },

    // Pre-fetch the current surah's audio so it is available offline. Text and timing
    // responses are already cached by the service worker after loadSurah; fetching the
    // audio files populates the CacheFirst audio cache. Uses CORS so failures are real.
    async downloadCurrentSurah() {
      const num = this.currentSurahNum
      if (this.downloadingSurah !== null) {
        return
      }
      this.downloadingSurah = num
      this.downloadError = false
      try {
        const rawUrls =
          this.playbackMode === 'full' ? (this.audioUrl ? [this.audioUrl] : []) : this.audioUrls
        const urls = sanitizeAudioUrls(rawUrls)
        if (!urls.length) {
          throw new Error('No downloadable audio URLs')
        }
        for (const url of urls) {
          const res = await fetch(url)
          if (!res.ok) {
            throw new Error(`Download failed (HTTP ${res.status})`)
          }
          // Best-effort: seed the same runtime caches the service worker uses.
          await putResponseInAudioCaches(url, res.clone())
          // Fully consume the body so the download is complete even without Cache API.
          await res.arrayBuffer()
        }
        if (!this.downloadedSurahs.includes(num)) {
          this.downloadedSurahs.push(num)
        }
        this.savePreferences()
      } catch {
        this.downloadError = true
      } finally {
        this.downloadingSurah = null
      }
    },

    removeDownload(num) {
      this.downloadedSurahs = this.downloadedSurahs.filter(n => n !== num)
      this.savePreferences()
    },

    getVerseIndexAtTime(timeMs) {
      const timings = this.verseTimings
      if (timings.length === 0) {
        return 0
      }
      let lo = 0,
        hi = timings.length - 1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (timings[mid].timestampFrom <= timeMs) {
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      return Math.max(0, hi)
    },

    // Pre-compute word counts per verse (call after loading verses)
    computeWordCounts() {
      // Count real words only (standalone waqf marks U+06D6..U+06ED are not words),
      // matching the token splitter in utils/arabicText.js so highlight indices align.
      this._wordCounts = this.verses.map(
        v => v.text.split(/\s+/).filter(w => w && !/^[\u06D6-\u06ED]+$/.test(w)).length - 1
      )
    },

    getWordIndexAtTime(timeMs, verseIndex) {
      const timing = this.verseTimings[verseIndex]
      if (!timing || !timing.segments || timing.segments.length === 0) {
        return -1
      }
      const maxWordIndex = this._wordCounts?.[verseIndex] ?? -1
      if (maxWordIndex < 0) {
        return -1
      }
      const segs = timing.segments
      let lo = 0
      let hi = segs.length - 1
      let best = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (segs[mid].from <= timeMs) {
          best = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      if (best < 0) {
        return -1
      }
      return Math.min(segs[best].wordIndex, maxWordIndex)
    },

    setVerse(index) {
      if (index >= 0 && index < this.verses.length) {
        this.currentVerseIndex = index
        this.currentWordIndex = -1
        this.savePreferences()
      }
    },

    nextVerse() {
      if (this.canNextVerse) {
        this.currentVerseIndex++
        this.currentWordIndex = -1
        this.savePreferences()
      }
    },

    prevVerse() {
      if (this.canPrevVerse) {
        this.currentVerseIndex--
        this.currentWordIndex = -1
        this.savePreferences()
      }
    },

    setWordHighlight(val) {
      this.wordHighlight = val
      this.savePreferences()
    },

    setHighlightStyle(style) {
      this.highlightStyle = style
      this.savePreferences()
    },

    setVerseAction(name, value) {
      if (name in this.verseActions) {
        this.verseActions[name] = !!value
        this.savePreferences()
      }
    },

    setTafsirSource(id) {
      this.tafsirSource = id
      this.savePreferences()
    },

    setShowFootnotes(value) {
      this.showFootnotes = !!value
      this.savePreferences()
    },

    setVerseEndOrnament(value) {
      this.verseEndOrnament = !!value
      this.savePreferences()
    },

    setJustifyText(value) {
      this.justifyText = !!value
      this.savePreferences()
    },

    setReadingMode(value) {
      this.readingMode = !!value
      this.savePreferences()
    },

    setReadMode(value) {
      this.readMode = !!value
      this.savePreferences()
    },

    setUiLanguage(code) {
      this.uiLanguage = setUiLocale(code)
      this.savePreferences()
    },

    async loadTajweed() {
      if (!this.tajweed) {
        return
      }
      const surah = this.currentSurahNum
      try {
        const data = await fetchSurahTajweed(surah)
        // Ignore if the surah changed while fetching.
        if (this.currentSurahNum === surah) {
          this.tajweedVerses = data.tajweedVerses
        }
      } catch {
        this.tajweedVerses = []
      }
    },

    setTajweed(value) {
      this.tajweed = !!value
      this.savePreferences()
      if (this.tajweed && this.tajweedVerses.length === 0) {
        void this.loadTajweed()
      }
    },

    async loadQcf() {
      if (!this.mushafMode) {
        return
      }
      const surah = this.currentSurahNum
      try {
        const data = await fetchSurahQcf(surah)
        if (this.currentSurahNum !== surah) {
          return
        }
        this.qcfVerses = data.qcfVerses
        // Inject the @font-face for every page used by this surah.
        const pages = new Set()
        for (const words of data.qcfVerses) {
          for (const w of words) {
            pages.add(w.page)
          }
        }
        pages.forEach(p => ensureQcfPageFont(p))
      } catch {
        this.qcfVerses = []
      }
    },

    setMushafMode(value) {
      this.mushafMode = !!value
      this.savePreferences()
      if (this.mushafMode && this.qcfVerses.length === 0) {
        void this.loadQcf()
      }
    },

    setRepeatMode(mode) {
      this.repeatMode = mode
      this.savePreferences()
    },

    setPlaybackSpeed(speed) {
      this.playbackSpeed = speed
      this.savePreferences()
    },

    setVolume(value) {
      this.volume = Math.max(0, Math.min(1, value))
      this.savePreferences()
    },

    // A-B repeat (memorization): loop a verse range. start/end are verse indices.
    setAbRepeat(start, end) {
      const lo = Math.min(start, end)
      const hi = Math.max(start, end)
      this.abRepeat = { start: lo, end: hi }
    },

    clearAbRepeat() {
      this.abRepeat = null
    },

    async setSurah(num) {
      this.currentSurahNum = num
      this.currentVerseIndex = 0
      this.abRepeat = null
      this.savePreferences()
      await this.loadSurah()
      if (!this.error) {
        this.addRecentSurah(num)
      }
    },

    setReciter(id) {
      this.currentReciter = id
      // Verse text and numbering are identical across reciters, so keep the
      // current reading position; loadSurah clamps indexes past the surah end.
      // Word timing segments are reciter-specific, so drop the highlight.
      this.currentWordIndex = -1
      this.savePreferences()
      return this.loadSurah()
    },

    async applyArabicFont(id, { save = true } = {}) {
      // Apply the id immediately so concurrent savePreferences (e.g. loadSurah)
      // never rewrites localStorage with the previous default font.
      this.arabicFont = id
      if (save) {
        this.savePreferences()
      }
      const requestId = ++latestArabicFontRequestId
      await ensureArabicFontLoaded(id)
      if (requestId !== latestArabicFontRequestId) {
        return
      }
    },

    setArabicFont(id) {
      return this.applyArabicFont(id)
    },

    setArabicFontSize(size) {
      this.arabicFontSize = size
      this.savePreferences()
    },

    setTranslationFontSize(size) {
      this.translationFontSize = size
      this.savePreferences()
    },

    setContentWidth(width) {
      this.contentWidth = width
      this.savePreferences()
    },

    setTheme(id) {
      this.theme = id
      applyThemeToDocument(id)
      this.savePreferences()
    },

    // Re-apply the theme when the OS color scheme changes (only matters for 'auto').
    bindAutoTheme() {
      if (autoThemeListenerBound || typeof window === 'undefined' || !window.matchMedia) {
        return
      }
      autoThemeListenerBound = true
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      mql.addEventListener('change', () => {
        if (this.theme === 'auto') {
          applyThemeToDocument('auto')
        }
      })
    },

    setAutoHideControls(val) {
      this.autoHideControls = val
      this.savePreferences()
    },

    setAnimations(val) {
      this.animations = val
      document.documentElement.classList.toggle('no-animations', !val)
      this.savePreferences()
    },

    setTranslation(id) {
      this.currentTranslation = id
      this.savePreferences()
      return this.loadSurah()
    },

    async loadExtraTranslations() {
      const ids = this.extraTranslations
      const surah = this.currentSurahNum
      if (!ids.length) {
        this.extraTranslationVerses = []
        return
      }
      try {
        const data = await fetchTranslations(surah, ids)
        if (this.currentSurahNum === surah) {
          this.extraTranslationVerses = data.translations
        }
      } catch {
        this.extraTranslationVerses = []
      }
    },

    addExtraTranslation(id) {
      if (id && !this.extraTranslations.includes(id) && id !== this.currentTranslation) {
        this.extraTranslations.push(id)
        this.savePreferences()
        void this.loadExtraTranslations()
      }
    },

    removeExtraTranslation(id) {
      this.extraTranslations = this.extraTranslations.filter(t => t !== id)
      this.extraTranslationVerses = this.extraTranslationVerses.filter(t => t.id !== id)
      this.savePreferences()
    },

    async nextSurah() {
      if (this.canNextSurah) {
        this.currentSurahNum++
        this.currentVerseIndex = 0
        this.abRepeat = null
        this.savePreferences()
        await this.loadSurah()
        if (!this.error) {
          this.addRecentSurah(this.currentSurahNum)
        }
      }
    },

    async prevSurah() {
      if (this.canPrevSurah) {
        this.currentSurahNum--
        this.currentVerseIndex = 0
        this.abRepeat = null
        this.savePreferences()
        await this.loadSurah()
        if (!this.error) {
          this.addRecentSurah(this.currentSurahNum)
        }
      }
    },

    async setJuz(num) {
      const juz = JUZS.find(j => j.number === num)
      if (!juz) {
        return
      }
      await this.setSurah(juz.startSurah)
      const idx = this.verses.findIndex(v => v.number === juz.startVerse)
      if (idx >= 0) {
        this.currentVerseIndex = idx
        this.currentWordIndex = -1
        // Persist the jumped-to verse; setSurah only saved verse 0.
        this.savePreferences()
      }
    },

    toggleBookmark() {
      const verse = this.currentVerse
      const translation = this.currentTranslationVerse
      if (!verse) {
        return
      }
      const existing = this.bookmarks.findIndex(
        b => b.surahNum === this.currentSurahNum && b.verseIndex === this.currentVerseIndex
      )
      if (existing >= 0) {
        this.bookmarks.splice(existing, 1)
      } else {
        this.bookmarks.push({
          surahNum: this.currentSurahNum,
          verseIndex: this.currentVerseIndex,
          surahName: this.currentSurah?.englishName || '',
          surahArabicName: this.currentSurah?.name || '',
          verseNumber: verse.number,
          verseText: verse.text,
          translationText: translation?.text || '',
          timestamp: Date.now()
        })
      }
      this.savePreferences()
    },

    removeBookmark(index) {
      if (index >= 0 && index < this.bookmarks.length) {
        this.bookmarks.splice(index, 1)
        this.savePreferences()
      }
    },

    addRecentSurah(num) {
      this.recentSurahs = this.recentSurahs.filter(n => n !== num)
      this.recentSurahs.unshift(num)
      if (this.recentSurahs.length > 10) {
        this.recentSurahs.pop()
      }
      this.savePreferences()
    },

    // Immediate write for durable user actions (bookmarks, theme, surah). High-frequency
    // callers (word highlight) already debounce via SAVE_PREFS_DEBOUNCE before calling.
    // pagehide/visibility only flush a pending timer if one is ever scheduled.
    savePreferences() {
      ensurePrefsFlushListeners(this)
      if (savePrefsTimer) {
        clearTimeout(savePrefsTimer)
        savePrefsTimer = null
      }
      this.writePreferencesNow()
    },

    writePreferencesNow() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            version: PREFS_VERSION,
            surah: this.currentSurahNum,
            verse: this.currentVerseIndex,
            reciter: this.currentReciter,
            translation: this.currentTranslation,
            extraTranslations: this.extraTranslations,
            arabicFont: this.arabicFont,
            arabicFontSize: this.arabicFontSize,
            translationFontSize: this.translationFontSize,
            contentWidth: this.contentWidth,
            theme: this.theme,
            uiLanguage: this.uiLanguage,
            autoHideControls: this.autoHideControls,
            wordHighlight: this.wordHighlight,
            highlightStyle: this.highlightStyle,
            verseActions: this.verseActions,
            tafsirSource: this.tafsirSource,
            showFootnotes: this.showFootnotes,
            verseEndOrnament: this.verseEndOrnament,
            justifyText: this.justifyText,
            readingMode: this.readingMode,
            readMode: this.readMode,
            tajweed: this.tajweed,
            mushafMode: this.mushafMode,
            repeatMode: this.repeatMode,
            playbackSpeed: this.playbackSpeed,
            volume: this.volume,
            animations: this.animations,
            bookmarks: this.bookmarks,
            recentSurahs: this.recentSurahs,
            downloadedSurahs: this.downloadedSurahs
          })
        )
      } catch {
        // Ignore storage errors (private mode, quota, corrupt JSON).
      }
    },

    applyResponsiveDefaults() {
      const d = getResponsiveDefaults()
      this.arabicFontSize = d.arabicFontSize
      this.translationFontSize = d.translationFontSize
      this.contentWidth = d.contentWidth
    },

    loadPreferences() {
      this.bindAutoTheme()
      ensurePrefsFlushListeners(this)
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (!saved) {
          // First visit: apply responsive defaults
          this.applyResponsiveDefaults()
          void ensureArabicFontLoaded(this.arabicFont)
          return
        }

        const raw = JSON.parse(saved)
        const prefs = normalizePrefs(migratePrefs(raw))
        // Always persist the current schema version after a successful load/migrate.
        if (raw?.version !== PREFS_VERSION) {
          // Defer so field assignment below is reflected in the write.
          queueMicrotask(() => this.writePreferencesNow())
        }
        const savedArabicFont = prefs.arabicFont
        if (prefs.surah) {
          this.currentSurahNum = prefs.surah
        }
        if (prefs.verse !== undefined) {
          this.currentVerseIndex = prefs.verse
        }
        if (prefs.reciter) {
          this.currentReciter = prefs.reciter
        }
        if (prefs.translation) {
          this.currentTranslation = prefs.translation
        }
        if (Array.isArray(prefs.extraTranslations)) {
          this.extraTranslations = prefs.extraTranslations
        }
        if (prefs.arabicFontSize) {
          this.arabicFontSize = prefs.arabicFontSize
        }
        if (prefs.translationFontSize) {
          this.translationFontSize = prefs.translationFontSize
        }
        if (prefs.contentWidth) {
          this.contentWidth = prefs.contentWidth
        }
        if (prefs.theme) {
          this.theme = prefs.theme
          applyThemeToDocument(prefs.theme)
        }
        if (prefs.uiLanguage) {
          this.uiLanguage = prefs.uiLanguage
        }
        if (prefs.autoHideControls !== undefined) {
          this.autoHideControls = prefs.autoHideControls
        }
        if (prefs.wordHighlight !== undefined) {
          this.wordHighlight = prefs.wordHighlight
        }
        if (prefs.highlightStyle && HIGHLIGHT_STYLES.has(prefs.highlightStyle)) {
          this.highlightStyle = prefs.highlightStyle
        }
        if (prefs.verseActions && typeof prefs.verseActions === 'object') {
          this.verseActions = {
            bookmark: prefs.verseActions.bookmark !== false,
            share: prefs.verseActions.share !== false,
            copy: prefs.verseActions.copy !== false,
            tafsir: prefs.verseActions.tafsir !== false
          }
        }
        if (typeof prefs.tafsirSource === 'number' && TAFSIR_IDS.has(prefs.tafsirSource)) {
          this.tafsirSource = prefs.tafsirSource
        }
        if (prefs.showFootnotes !== undefined) {
          this.showFootnotes = !!prefs.showFootnotes
        }
        if (prefs.verseEndOrnament !== undefined) {
          this.verseEndOrnament = !!prefs.verseEndOrnament
        }
        if (prefs.justifyText !== undefined) {
          this.justifyText = !!prefs.justifyText
        }
        if (prefs.readingMode !== undefined) {
          this.readingMode = !!prefs.readingMode
        }
        if (prefs.readMode !== undefined) {
          this.readMode = !!prefs.readMode
        }
        if (prefs.tajweed !== undefined) {
          this.tajweed = !!prefs.tajweed
        }
        if (prefs.mushafMode !== undefined) {
          this.mushafMode = !!prefs.mushafMode
        }
        if (prefs.repeatMode && REPEAT_MODES.has(prefs.repeatMode)) {
          this.repeatMode = prefs.repeatMode
        }
        if (prefs.playbackSpeed) {
          this.playbackSpeed = prefs.playbackSpeed
        }
        if (typeof prefs.volume === 'number') {
          this.volume = Math.max(0, Math.min(1, prefs.volume))
        }
        if (prefs.animations !== undefined) {
          this.animations = prefs.animations
          document.documentElement.classList.toggle('no-animations', !prefs.animations)
        }
        if (savedArabicFont) {
          void this.applyArabicFont(savedArabicFont, { save: false })
        } else {
          void ensureArabicFontLoaded(this.arabicFont)
        }
        if (Array.isArray(prefs.bookmarks)) {
          this.bookmarks = prefs.bookmarks
        }
        if (Array.isArray(prefs.recentSurahs)) {
          this.recentSurahs = prefs.recentSurahs
        }
        if (Array.isArray(prefs.downloadedSurahs)) {
          this.downloadedSurahs = prefs.downloadedSurahs
        }
      } catch {
        // Ignore storage errors (private mode, quota, corrupt JSON).
      }
    }
  }
})
