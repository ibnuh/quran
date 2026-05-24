import { defineStore } from 'pinia'
import {
  fetchSurahText,
  fetchSurahTextQuranCom,
  fetchSurahAudio,
  fetchVerseAudio,
  fetchSurahTajweed,
  fetchTranslations,
  getCachedSurah,
  cacheSurah
} from '../services/api.js'
import { parseTajweed } from '../utils/arabicText.js'
import { STORAGE_KEY, PREFS_VERSION, TOTAL_SURAHS, getResponsiveDefaults } from '../config.js'
import SURAHS from '../data/surahs.js'
import RECITERS from '../data/reciters.js'
import ARABIC_FONTS, { getFontMetrics } from '../data/fonts.js'
import TRANSLATIONS from '../data/translations.js'
import THEMES, { applyThemeToDocument } from '../data/themes.js'
import JUZS, { getJuzForVerse } from '../data/juzs.js'

let autoThemeListenerBound = false

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
    return isAudio
      ? 'Audio is unavailable for this reciter and surah.'
      : 'This surah or translation could not be found.'
  }
  if (kind === 'network') {
    return 'Network error. Please check your connection and try again.'
  }
  if (kind === 'invalid' || kind === 'http') {
    return isAudio
      ? 'The audio service is unavailable right now. Try another reciter.'
      : 'The text service is unavailable right now. Please try again.'
  }
  return 'Failed to load surah. Please check your connection and try again.'
}

// Migrate and validate persisted preferences across schema versions, dropping
// values that no longer reference valid reciters/themes/fonts/surahs so the store
// can fall back to its defaults instead of breaking.
function normalizePrefs(prefs) {
  const out = { ...prefs }
  // v1 -> v2: reciter was stored as a numeric cdnId.
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
  if (typeof out.playbackSpeed !== 'number' || out.playbackSpeed <= 0) {
    out.playbackSpeed = undefined
  }
  return out
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
    verseTimings: [],
    // Per-verse audio (alquran.cloud fallback)
    audioUrls: [],
    arabicFont: 'amiri-quran',
    arabicFontSize: _responsiveDefaults.arabicFontSize,
    translationFontSize: _responsiveDefaults.translationFontSize,
    contentWidth: _responsiveDefaults.contentWidth,
    theme: 'light',
    autoHideControls: true,
    currentWordIndex: -1,
    wordHighlight: true,
    highlightStyle: 'flow', // 'glow' | 'background' | 'underline' | 'minimal' | 'sweep' | 'flow'
    // Per-verse action button visibility (under the verse number).
    verseActions: { bookmark: true, share: true, copy: true, tafsir: true },
    tafsirSource: 169, // quran.com tafsir id (default: Ibn Kathir, abridged, en)
    // Render the traditional end-of-ayah ornament inline instead of the number badge.
    verseEndOrnament: false,
    // Justify the Arabic text block (mushaf style) instead of centering it.
    justifyText: false,
    // Continuous reading layout (all verses scrollable) vs single-verse focus.
    readingMode: false,
    // Tajweed coloring (quran.com annotated text); loaded on demand per surah.
    tajweed: false,
    tajweedVerses: [],
    repeatMode: 'none', // 'none' | 'verse' | 'surah'
    abRepeat: null, // { start: verseIndex, end: verseIndex } for A-B memorization loop
    playbackSpeed: 1,
    volume: 1,
    animations: true,
    isLoading: false,
    error: null,
    errorKind: null, // 'text' | 'audio' | null
    bookmarks: [],
    recentSurahs: []
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
      )
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
      // Tajweed text and extra translations are surah-specific; reload per surah.
      this.tajweedVerses = []
      this.extraTranslationVerses = []

      const reciter = this.currentReciterData
      if (!reciter) {
        this.error = 'Unknown reciter selected.'
        this.errorKind = 'audio'
        this.isLoading = false
        return
      }

      // Check if neither audio source is available
      if (!reciter.cdnId && !reciter.cloudId) {
        this.error = 'No audio source available for this reciter.'
        this.errorKind = 'audio'
        this.isLoading = false
        return
      }

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
        this.audioUrl = cached.audioUrl
        this.verseTimings = cached.verseTimings
        this.audioUrls = cached.audioUrls
        if (this.currentVerseIndex >= this.verses.length) {
          this.currentVerseIndex = 0
        }
        this.computeWordCounts()
        this.isLoading = false
        if (this.tajweed) {
          void this.loadTajweed()
        }
        if (this.extraTranslations.length) {
          void this.loadExtraTranslations()
        }
        return
      }

      try {
        const isQuranCom = this.currentTranslation.startsWith('qdc.')
        // Start the text fetch in parallel; settle to a result/error object so a
        // text rejection never becomes unhandled if audio fails first.
        const textSettled = (
          isQuranCom
            ? fetchSurahTextQuranCom(
                this.currentSurahNum,
                parseInt(this.currentTranslation.slice(4)),
                signal
              )
            : fetchSurahText(this.currentSurahNum, this.currentTranslation, signal)
        ).then(
          data => ({ data }),
          error => ({ error })
        )

        // Try full surah audio first, then fall back to per-verse.
        let audioResult = null
        let audioError = null

        if (reciter.cdnId) {
          try {
            const data = await fetchSurahAudio(reciter.cdnId, this.currentSurahNum, signal)
            audioResult = {
              mode: 'full',
              audioUrl: data.audioUrl,
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

        if (!audioResult && reciter.cloudId) {
          try {
            const data = await fetchVerseAudio(reciter.cloudId, this.currentSurahNum, signal)
            audioResult = {
              mode: 'verse',
              audioUrl: null,
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

        const { data: textData, error: textError } = await textSettled

        if (signal.aborted) {
          return
        }

        if (!audioResult) {
          this.error = errorMessageFor(audioError, { isAudio: true })
          this.errorKind = 'audio'
          return
        }

        if (textError) {
          this.error = errorMessageFor(textError, { isAudio: false })
          this.errorKind = 'text'
          return
        }

        this.verses = textData.verses
        this.translationVerses = textData.translationVerses
        this.playbackMode = audioResult.mode
        this.audioUrl = audioResult.audioUrl
        this.verseTimings = audioResult.verseTimings
        this.audioUrls = audioResult.audioUrls
        this.errorKind = null

        if (this.currentVerseIndex >= this.verses.length) {
          this.currentVerseIndex = 0
        }
        this.computeWordCounts()

        // Cache the result
        cacheSurah(this.currentSurahNum, this.currentTranslation, this.currentReciter, {
          verses: textData.verses,
          translationVerses: textData.translationVerses,
          playbackMode: audioResult.mode,
          audioUrl: audioResult.audioUrl,
          verseTimings: audioResult.verseTimings,
          audioUrls: audioResult.audioUrls
        })

        if (this.tajweed) {
          void this.loadTajweed()
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
        const isQuranCom = this.currentTranslation.startsWith('qdc.')
        const [textData, audioData] = await Promise.all([
          isQuranCom
            ? fetchSurahTextQuranCom(nextNum, parseInt(this.currentTranslation.slice(4)))
            : fetchSurahText(nextNum, this.currentTranslation),
          reciter.cdnId
            ? fetchSurahAudio(reciter.cdnId, nextNum).catch(() => null)
            : Promise.resolve(null)
        ])

        let audioResult
        if (audioData) {
          audioResult = {
            playbackMode: 'full',
            audioUrl: audioData.audioUrl,
            verseTimings: audioData.verseTimings,
            audioUrls: []
          }
        } else if (reciter.cloudId) {
          const verseData = await fetchVerseAudio(reciter.cloudId, nextNum)
          audioResult = {
            playbackMode: 'verse',
            audioUrl: null,
            verseTimings: [],
            audioUrls: verseData.audioUrls
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
      for (let i = timing.segments.length - 1; i >= 0; i--) {
        const seg = timing.segments[i]
        if (timeMs >= seg.from) {
          return Math.min(seg.wordIndex, maxWordIndex)
        }
      }
      return -1
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
      this.currentVerseIndex = 0
      this.savePreferences()
      return this.loadSurah()
    },

    async applyArabicFont(id, { save = true } = {}) {
      const requestId = ++latestArabicFontRequestId
      await ensureArabicFontLoaded(id)
      if (requestId !== latestArabicFontRequestId) {
        return
      }

      this.arabicFont = id
      if (save) {
        this.savePreferences()
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

    savePreferences() {
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
            autoHideControls: this.autoHideControls,
            wordHighlight: this.wordHighlight,
            highlightStyle: this.highlightStyle,
            verseActions: this.verseActions,
            tafsirSource: this.tafsirSource,
            verseEndOrnament: this.verseEndOrnament,
            justifyText: this.justifyText,
            readingMode: this.readingMode,
            tajweed: this.tajweed,
            repeatMode: this.repeatMode,
            playbackSpeed: this.playbackSpeed,
            volume: this.volume,
            animations: this.animations,
            bookmarks: this.bookmarks,
            recentSurahs: this.recentSurahs
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
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (!saved) {
          // First visit: apply responsive defaults
          this.applyResponsiveDefaults()
          void ensureArabicFontLoaded(this.arabicFont)
          return
        }

        const prefs = normalizePrefs(JSON.parse(saved))
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
          this.extraTranslations = prefs.extraTranslations.filter(id => typeof id === 'string')
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
        if (prefs.autoHideControls !== undefined) {
          this.autoHideControls = prefs.autoHideControls
        }
        if (prefs.wordHighlight !== undefined) {
          this.wordHighlight = prefs.wordHighlight
        }
        if (prefs.highlightStyle) {
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
        if (typeof prefs.tafsirSource === 'number') {
          this.tafsirSource = prefs.tafsirSource
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
        if (prefs.tajweed !== undefined) {
          this.tajweed = !!prefs.tajweed
        }
        if (prefs.repeatMode) {
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
      } catch {
        // Ignore storage errors (private mode, quota, corrupt JSON).
      }
    }
  }
})
