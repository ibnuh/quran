import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from './player.js'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('getVerseIndexAtTime', () => {
  it('returns 0 when there are no timings', () => {
    const store = usePlayerStore()
    store.verseTimings = []
    expect(store.getVerseIndexAtTime(5000)).toBe(0)
  })

  it('finds the verse containing the timestamp via binary search', () => {
    const store = usePlayerStore()
    store.verseTimings = [
      { timestampFrom: 0 },
      { timestampFrom: 10000 },
      { timestampFrom: 20000 },
      { timestampFrom: 30000 }
    ]
    expect(store.getVerseIndexAtTime(0)).toBe(0)
    expect(store.getVerseIndexAtTime(5000)).toBe(0)
    expect(store.getVerseIndexAtTime(10000)).toBe(1)
    expect(store.getVerseIndexAtTime(25000)).toBe(2)
    expect(store.getVerseIndexAtTime(99999)).toBe(3)
  })
})

describe('computeWordCounts + getWordIndexAtTime', () => {
  it('clamps word index to the verse word count', () => {
    const store = usePlayerStore()
    store.verses = [{ number: 1, text: 'كلمة كلمة كلمة' }]
    store.computeWordCounts()
    store.verseTimings = [
      {
        segments: [
          { wordIndex: 0, from: 0 },
          { wordIndex: 1, from: 1000 },
          { wordIndex: 2, from: 2000 },
          { wordIndex: 5, from: 3000 }
        ]
      }
    ]
    expect(store.getWordIndexAtTime(0, 0)).toBe(0)
    expect(store.getWordIndexAtTime(1500, 0)).toBe(1)
    // index 5 segment clamps to max word index (2 words, 0-indexed -> 2)
    expect(store.getWordIndexAtTime(3500, 0)).toBe(2)
  })

  it('returns -1 before any segment starts', () => {
    const store = usePlayerStore()
    store.verses = [{ number: 1, text: 'كلمة كلمة' }]
    store.computeWordCounts()
    store.verseTimings = [{ segments: [{ wordIndex: 0, from: 1000 }] }]
    expect(store.getWordIndexAtTime(500, 0)).toBe(-1)
  })
})

describe('bookmarks', () => {
  it('toggles a bookmark for the current verse', () => {
    const store = usePlayerStore()
    store.verses = [{ number: 1, text: 'a' }]
    store.translationVerses = [{ number: 1, text: 'one' }]
    store.currentVerseIndex = 0
    expect(store.isCurrentBookmarked).toBe(false)
    store.toggleBookmark()
    expect(store.isCurrentBookmarked).toBe(true)
    store.toggleBookmark()
    expect(store.isCurrentBookmarked).toBe(false)
  })
})

describe('recent surahs', () => {
  it('keeps most recent first and caps at 10', () => {
    const store = usePlayerStore()
    for (let i = 1; i <= 12; i++) {
      store.addRecentSurah(i)
    }
    expect(store.recentSurahs[0]).toBe(12)
    expect(store.recentSurahs.length).toBe(10)
  })

  it('moves an existing surah to the front without duplicating', () => {
    const store = usePlayerStore()
    store.addRecentSurah(5)
    store.addRecentSurah(8)
    store.addRecentSurah(5)
    expect(store.recentSurahs[0]).toBe(5)
    expect(store.recentSurahs.filter(n => n === 5).length).toBe(1)
  })
})

describe('volume', () => {
  it('clamps volume to the 0..1 range', () => {
    const store = usePlayerStore()
    store.setVolume(1.5)
    expect(store.volume).toBe(1)
    store.setVolume(-0.2)
    expect(store.volume).toBe(0)
    store.setVolume(0.4)
    expect(store.volume).toBe(0.4)
  })
})

describe('A-B repeat', () => {
  it('orders start and end regardless of argument order', () => {
    const store = usePlayerStore()
    store.setAbRepeat(5, 2)
    expect(store.abRepeat).toEqual({ start: 2, end: 5 })
  })

  it('clears the repeat range', () => {
    const store = usePlayerStore()
    store.setAbRepeat(1, 3)
    store.clearAbRepeat()
    expect(store.abRepeat).toBe(null)
  })

  it('resets the repeat range when the surah changes', async () => {
    const store = usePlayerStore()
    store.loadSurah = async () => {} // avoid real network in unit test
    store.abRepeat = { start: 0, end: 0 }
    await store.nextSurah()
    expect(store.abRepeat).toBe(null)
  })
})

describe('preferences persistence', () => {
  it('round-trips saved preferences through localStorage', () => {
    const store = usePlayerStore()
    store.currentSurahNum = 36
    store.currentReciter = 'sudais'
    store.playbackSpeed = 1.5
    store.savePreferences()

    setActivePinia(createPinia())
    const fresh = usePlayerStore()
    fresh.loadPreferences()
    expect(fresh.currentSurahNum).toBe(36)
    expect(fresh.currentReciter).toBe('sudais')
    expect(fresh.playbackSpeed).toBe(1.5)
  })

  it('migrates a legacy numeric reciter (cdnId) to its id', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ reciter: 7 }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.currentReciter).toBe('alafasy')
  })

  it('drops an unknown reciter and keeps the default', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ reciter: 'does-not-exist' }))
    const store = usePlayerStore()
    const original = store.currentReciter
    store.loadPreferences()
    expect(store.currentReciter).toBe(original)
  })

  it('ignores an out-of-range surah', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ surah: 999 }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.currentSurahNum).toBe(1)
  })

  it('ignores an unknown theme', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ theme: 'neon' }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.theme).toBe('light')
  })
})
