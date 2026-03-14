import { defineStore } from 'pinia'
import { fetchSurahText, fetchSurahAudio } from '../services/api.js'
import SURAHS from '../data/surahs.js'

const STORAGE_KEY = 'quran-player-prefs'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentSurahNum: 1,
    currentReciter: 7,
    currentTranslation: 'en.sahih',
    currentVerseIndex: 0,
    verses: [],
    translationVerses: [],
    audioUrl: null,
    verseTimings: [],
    isLoading: false,
    error: null
  }),

  getters: {
    currentSurah: (state) => SURAHS.find(s => s.number === state.currentSurahNum),
    currentVerse: (state) => state.verses[state.currentVerseIndex] || null,
    currentTranslationVerse: (state) => state.translationVerses[state.currentVerseIndex] || null,
    totalVerses: (state) => state.verses.length,
    showBismillah: (state) => state.currentSurahNum !== 1 && state.currentSurahNum !== 9 && state.currentVerseIndex === 0,
    canPrevVerse: (state) => state.currentVerseIndex > 0,
    canNextVerse: (state) => state.currentVerseIndex < state.verses.length - 1,
    canPrevSurah: (state) => state.currentSurahNum > 1,
    canNextSurah: (state) => state.currentSurahNum < 114
  },

  actions: {
    async loadSurah() {
      if (this.isLoading) return
      this.isLoading = true
      this.error = null

      try {
        const [textData, audioData] = await Promise.all([
          fetchSurahText(this.currentSurahNum, this.currentTranslation),
          fetchSurahAudio(this.currentReciter, this.currentSurahNum)
        ])

        this.verses = textData.verses
        this.translationVerses = textData.translationVerses
        this.audioUrl = audioData.audioUrl
        this.verseTimings = audioData.verseTimings

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

    setTranslation(id) {
      this.currentTranslation = id
      this.currentVerseIndex = 0
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
          translation: this.currentTranslation
        }))
      } catch (e) {}
    },

    loadPreferences() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const prefs = JSON.parse(saved)
          if (prefs.surah) this.currentSurahNum = prefs.surah
          if (prefs.reciter) this.currentReciter = prefs.reciter
          if (prefs.translation) this.currentTranslation = prefs.translation
        }
      } catch (e) {}
    }
  }
})
