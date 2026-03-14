import { defineStore } from 'pinia'
import { fetchSurahText, fetchSurahAudio, fetchVerseAudio } from '../services/api.js'
import SURAHS from '../data/surahs.js'
import RECITERS from '../data/reciters.js'
import ARABIC_FONTS from '../data/fonts.js'

const STORAGE_KEY = 'quran-player-prefs'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentSurahNum: 1,
    currentReciter: 'alafasy',
    currentTranslation: 'en.sahih',
    currentVerseIndex: 0,
    verses: [],
    translationVerses: [],
    // Full surah audio (qurancdn.com)
    playbackMode: null, // 'full' | 'verse'
    audioUrl: null,
    verseTimings: [],
    // Per-verse audio (alquran.cloud fallback)
    audioUrls: [],
    arabicFont: 'uthmanic',
    arabicFontSize: 3.2,
    translationFontSize: 1.3,
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
      if (this.isLoading) return
      this.isLoading = true
      this.error = null

      const reciter = this.currentReciterData
      if (!reciter) {
        this.error = 'Unknown reciter selected.'
        this.isLoading = false
        return
      }

      try {
        const textPromise = fetchSurahText(this.currentSurahNum, this.currentTranslation)

        // Try full surah audio first, then fall back to per-verse
        let audioResult = null

        if (reciter.cdnId) {
          try {
            const data = await fetchSurahAudio(reciter.cdnId, this.currentSurahNum)
            audioResult = {
              mode: 'full',
              audioUrl: data.audioUrl,
              verseTimings: data.verseTimings,
              audioUrls: []
            }
          } catch (e) {
            // CDN failed, will try per-verse fallback
          }
        }

        if (!audioResult && reciter.cloudId) {
          const data = await fetchVerseAudio(reciter.cloudId, this.currentSurahNum)
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

        this.verses = textData.verses
        this.translationVerses = textData.translationVerses
        this.playbackMode = audioResult.mode
        this.audioUrl = audioResult.audioUrl
        this.verseTimings = audioResult.verseTimings
        this.audioUrls = audioResult.audioUrls

        if (this.currentVerseIndex >= this.verses.length) {
          this.currentVerseIndex = 0
        }
      } catch (err) {
        this.error = 'Failed to load surah. Please check your connection and try again.'
      } finally {
        this.isLoading = false
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

    setVerse(index) {
      if (index >= 0 && index < this.verses.length) {
        this.currentVerseIndex = index
      }
    },

    nextVerse() {
      if (this.canNextVerse) this.currentVerseIndex++
    },

    prevVerse() {
      if (this.canPrevVerse) this.currentVerseIndex--
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
          reciter: this.currentReciter,
          translation: this.currentTranslation,
          arabicFont: this.arabicFont,
          arabicFontSize: this.arabicFontSize,
          translationFontSize: this.translationFontSize
        }))
      } catch (e) {}
    },

    loadPreferences() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const prefs = JSON.parse(saved)
          if (prefs.surah) this.currentSurahNum = prefs.surah
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
        }
      } catch (e) {}
    }
  }
})
