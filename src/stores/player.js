import { defineStore } from 'pinia'
import { fetchSurahText, fetchSurahAudio, fetchVerseAudio, getCachedSurah, cacheSurah } from '../services/api.js'
import SURAHS from '../data/surahs.js'
import RECITERS from '../data/reciters.js'
import ARABIC_FONTS from '../data/fonts.js'

const STORAGE_KEY = 'quran-player-prefs'

let loadAbortController = null

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentSurahNum: 1,
    currentReciter: 'alafasy',
    currentTranslation: 'en.itani',
    currentVerseIndex: 0,
    verses: [],
    translationVerses: [],
    // Full surah audio (qurancdn.com)
    playbackMode: null, // 'full' | 'verse'
    audioUrl: null,
    verseTimings: [],
    // Per-verse audio (alquran.cloud fallback)
    audioUrls: [],
    arabicFont: 'amiri-quran',
    arabicFontSize: 3.2,
    translationFontSize: 1.3,
    contentWidth: 80,
    theme: 'light',
    autoHideControls: true,
    currentWordIndex: -1,
    wordHighlight: true,
    repeatMode: 'none', // 'none' | 'verse' | 'surah'
    playbackSpeed: 1,
    animations: true,
    isLoading: false,
    error: null
  }),

  getters: {
    currentSurah: (state) => SURAHS.find(s => s.number === state.currentSurahNum),
    currentReciterData: (state) => RECITERS.find(r => r.id === state.currentReciter),
    currentVerse: (state) => state.verses[state.currentVerseIndex] || null,
    currentTranslationVerse: (state) => state.translationVerses[state.currentVerseIndex] || null,
    totalVerses: (state) => state.verses.length,
    showBismillah: (state) => state.currentSurahNum !== 1 && state.currentSurahNum !== 9 && state.currentVerseIndex === 0,
    canPrevVerse: (state) => state.currentVerseIndex > 0,
    canNextVerse: (state) => state.currentVerseIndex < state.verses.length - 1,
    canPrevSurah: (state) => state.currentSurahNum > 1,
    canNextSurah: (state) => state.currentSurahNum < 114,
    arabicFontFamily: (state) => {
      const font = ARABIC_FONTS.find(f => f.id === state.arabicFont)
      return font ? font.family : ARABIC_FONTS[0].family
    }
  },

  actions: {
    async loadSurah() {
      // Abort any in-flight load
      if (loadAbortController) loadAbortController.abort()
      loadAbortController = new AbortController()
      const signal = loadAbortController.signal

      this.isLoading = true
      this.error = null

      const reciter = this.currentReciterData
      if (!reciter) {
        this.error = 'Unknown reciter selected.'
        this.isLoading = false
        return
      }

      // Check if neither audio source is available
      if (!reciter.cdnId && !reciter.cloudId) {
        this.error = 'No audio source available for this reciter.'
        this.isLoading = false
        return
      }

      // Check cache first
      const cached = getCachedSurah(this.currentSurahNum, this.currentTranslation, this.currentReciter)
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
        this.isLoading = false
        return
      }

      try {
        const textPromise = fetchSurahText(this.currentSurahNum, this.currentTranslation, signal)

        // Try full surah audio first, then fall back to per-verse
        let audioResult = null

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
            if (e.name === 'AbortError') throw e
            // CDN failed, will try per-verse fallback
          }
        }

        if (!audioResult && reciter.cloudId) {
          const data = await fetchVerseAudio(reciter.cloudId, this.currentSurahNum, signal)
          audioResult = {
            mode: 'verse',
            audioUrl: null,
            verseTimings: [],
            audioUrls: data.audioUrls
          }
        }

        if (!audioResult) {
          throw new Error('No audio source available for this reciter')
        }

        const textData = await textPromise

        // Check if this load was aborted while awaiting
        if (signal.aborted) return

        this.verses = textData.verses
        this.translationVerses = textData.translationVerses
        this.playbackMode = audioResult.mode
        this.audioUrl = audioResult.audioUrl
        this.verseTimings = audioResult.verseTimings
        this.audioUrls = audioResult.audioUrls

        if (this.currentVerseIndex >= this.verses.length) {
          this.currentVerseIndex = 0
        }

        // Cache the result
        cacheSurah(this.currentSurahNum, this.currentTranslation, this.currentReciter, {
          verses: textData.verses,
          translationVerses: textData.translationVerses,
          playbackMode: audioResult.mode,
          audioUrl: audioResult.audioUrl,
          verseTimings: audioResult.verseTimings,
          audioUrls: audioResult.audioUrls
        })
      } catch (err) {
        if (err.name === 'AbortError') return
        this.error = 'Failed to load surah. Please check your connection and try again.'
      } finally {
        if (!signal.aborted) this.isLoading = false
      }
    },

    // Preload next surah data into cache (no UI state change)
    async preloadNextSurah() {
      if (!this.canNextSurah) return
      const nextNum = this.currentSurahNum + 1
      const reciter = this.currentReciterData
      if (!reciter) return

      const cached = getCachedSurah(nextNum, this.currentTranslation, this.currentReciter)
      if (cached) return

      try {
        const [textData, audioData] = await Promise.all([
          fetchSurahText(nextNum, this.currentTranslation),
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
      } catch (e) {
        // Preload failure is silent
      }
    },

    getVerseIndexAtTime(timeMs) {
      for (let i = this.verseTimings.length - 1; i >= 0; i--) {
        if (timeMs >= this.verseTimings[i].timestampFrom) {
          return i
        }
      }
      return 0
    },

    getWordIndexAtTime(timeMs, verseIndex) {
      const timing = this.verseTimings[verseIndex]
      if (!timing || !timing.segments || timing.segments.length === 0) return -1
      const verse = this.verses[verseIndex]
      const maxWordIndex = verse ? verse.text.split(/\s+/).filter(w => w && !/^[\u06D6-\u06ED]$/.test(w)).length - 1 : -1
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

    setRepeatMode(mode) {
      this.repeatMode = mode
      this.savePreferences()
    },

    setPlaybackSpeed(speed) {
      this.playbackSpeed = speed
      this.savePreferences()
    },

    setSurah(num) {
      this.currentSurahNum = num
      this.currentVerseIndex = 0
      this.savePreferences()
      return this.loadSurah()
    },

    setReciter(id) {
      this.currentReciter = id
      this.currentVerseIndex = 0
      this.savePreferences()
      return this.loadSurah()
    },

    setArabicFont(id) {
      this.arabicFont = id
      this.savePreferences()
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
      document.documentElement.setAttribute('data-theme', id === 'light' ? '' : id)
      this.savePreferences()
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

    nextSurah() {
      if (this.canNextSurah) {
        this.currentSurahNum++
        this.currentVerseIndex = 0
        this.savePreferences()
        return this.loadSurah()
      }
    },

    prevSurah() {
      if (this.canPrevSurah) {
        this.currentSurahNum--
        this.currentVerseIndex = 0
        this.savePreferences()
        return this.loadSurah()
      }
    },

    savePreferences() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          surah: this.currentSurahNum,
          verse: this.currentVerseIndex,
          reciter: this.currentReciter,
          translation: this.currentTranslation,
          arabicFont: this.arabicFont,
          arabicFontSize: this.arabicFontSize,
          translationFontSize: this.translationFontSize,
          contentWidth: this.contentWidth,
          theme: this.theme,
          autoHideControls: this.autoHideControls,
          wordHighlight: this.wordHighlight,
          repeatMode: this.repeatMode,
          playbackSpeed: this.playbackSpeed,
          animations: this.animations
        }))
      } catch (e) {}
    },

    applyResponsiveDefaults() {
      const w = window.innerWidth
      if (w < 480) {
        // Small mobile
        this.arabicFontSize = 1.8
        this.translationFontSize = 0.95
        this.contentWidth = 100
      } else if (w < 768) {
        // Large mobile
        this.arabicFontSize = 2.0
        this.translationFontSize = 1.0
        this.contentWidth = 95
      } else if (w < 1024) {
        // Tablet
        this.arabicFontSize = 2.5
        this.translationFontSize = 1.1
        this.contentWidth = 85
      }
      // Desktop keeps the state defaults (3.2, 1.3, 80)
    },

    loadPreferences() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (!saved) {
          // First visit: apply responsive defaults
          this.applyResponsiveDefaults()
          return
        }

        const prefs = JSON.parse(saved)
        if (prefs.surah) this.currentSurahNum = prefs.surah
        if (prefs.verse !== undefined) this.currentVerseIndex = prefs.verse
        if (prefs.reciter) {
          // Handle migration from old numeric cdnId format
          if (typeof prefs.reciter === 'number') {
            const found = RECITERS.find(r => r.cdnId === prefs.reciter)
            if (found) this.currentReciter = found.id
          } else {
            this.currentReciter = prefs.reciter
          }
        }
        if (prefs.translation) this.currentTranslation = prefs.translation
        if (prefs.arabicFont) this.arabicFont = prefs.arabicFont
        if (prefs.arabicFontSize) this.arabicFontSize = prefs.arabicFontSize
        if (prefs.translationFontSize) this.translationFontSize = prefs.translationFontSize
        if (prefs.contentWidth) this.contentWidth = prefs.contentWidth
        if (prefs.theme) {
          this.theme = prefs.theme
          document.documentElement.setAttribute('data-theme', prefs.theme === 'light' ? '' : prefs.theme)
        }
        if (prefs.autoHideControls !== undefined) this.autoHideControls = prefs.autoHideControls
        if (prefs.wordHighlight !== undefined) this.wordHighlight = prefs.wordHighlight
        if (prefs.repeatMode) this.repeatMode = prefs.repeatMode
        if (prefs.playbackSpeed) this.playbackSpeed = prefs.playbackSpeed
        if (prefs.animations !== undefined) {
          this.animations = prefs.animations
          document.documentElement.classList.toggle('no-animations', !prefs.animations)
        }
      } catch (e) {}
    }
  }
})
