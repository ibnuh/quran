import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from './player.js'
import { cacheSurah } from '../services/api.js'

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

  it('maps a time one ms below a boundary to the previous verse (MP3 seek undershoot)', () => {
    const store = usePlayerStore()
    store.verseTimings = [{ timestampFrom: 0 }, { timestampFrom: 10000 }, { timestampFrom: 20000 }]
    // Seeking to verse 2 (10000ms) can land at 9999ms; this is why a manual
    // verse seek must suppress the timing-based recompute for a short window.
    expect(store.getVerseIndexAtTime(9999)).toBe(0)
    expect(store.getVerseIndexAtTime(10000)).toBe(1)
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
    // Immediate write (savePreferences is debounced).
    store.writePreferencesNow()

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

  it('drops a negative stored verse index', () => {
    // loadSurah only clamps indexes past the end; a negative or non-integer
    // index would survive it and leave currentVerse null.
    localStorage.setItem('quran-player-prefs', JSON.stringify({ verse: -3 }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.currentVerseIndex).toBe(0)
  })

  it('drops a non-numeric stored verse index', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ verse: '5' }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.currentVerseIndex).toBe(0)
  })

  it('drops a fractional stored verse index', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ verse: 2.5 }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.currentVerseIndex).toBe(0)
  })

  it('keeps a valid stored verse index', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ verse: 5 }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.currentVerseIndex).toBe(5)
  })

  it('ignores an unknown theme', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ theme: 'neon' }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.theme).toBe('light')
  })

  it('clamps a stored playbackSpeed above the supported range', () => {
    // Out-of-range rates would throw NotSupportedError when applied to the
    // media element on boot, so persisted values must be clamped.
    localStorage.setItem('quran-player-prefs', JSON.stringify({ playbackSpeed: 100 }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.playbackSpeed).toBe(2)
  })

  it('clamps a stored playbackSpeed below the supported range', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ playbackSpeed: 0.01 }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.playbackSpeed).toBe(0.5)
  })

  it('drops a non-numeric playbackSpeed and keeps the default', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ playbackSpeed: 'fast' }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.playbackSpeed).toBe(1)
  })

  it('normalizes a persisted numeric translation id to a qdc string', () => {
    // Quran.com ids were historically persisted as bare numbers; components
    // call startsWith on the value, so it must load as a string.
    localStorage.setItem('quran-player-prefs', JSON.stringify({ translation: 20 }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.currentTranslation).toBe('qdc.20')
  })

  it('keeps a persisted qdc string translation id as-is', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ translation: 'qdc.84' }))
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.currentTranslation).toBe('qdc.84')
  })

  it('drops a non-integer numeric translation id and keeps the default', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ translation: 20.5 }))
    const store = usePlayerStore()
    const original = store.currentTranslation
    store.loadPreferences()
    expect(store.currentTranslation).toBe(original)
  })

  it('drops a non-string non-number translation value', () => {
    localStorage.setItem('quran-player-prefs', JSON.stringify({ translation: { id: 20 } }))
    const store = usePlayerStore()
    const original = store.currentTranslation
    store.loadPreferences()
    expect(store.currentTranslation).toBe(original)
  })

  it('drops invalid highlightStyle, repeatMode, and tafsirSource', () => {
    localStorage.setItem(
      'quran-player-prefs',
      JSON.stringify({
        highlightStyle: 'neon-glow',
        repeatMode: 'forever',
        tafsirSource: 999999,
        volume: 2,
        extraTranslations: ['en.sahih', 'not-a-real-edition'],
        bookmarks: [{ surahNum: 1, verseIndex: 0 }, { bad: true }, null]
      })
    )
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.highlightStyle).toBe('flow')
    expect(store.repeatMode).toBe('none')
    expect(store.tafsirSource).toBe(169)
    expect(store.volume).toBe(1)
    expect(store.extraTranslations).toEqual(['en.sahih'])
    expect(store.bookmarks).toEqual([{ surahNum: 1, verseIndex: 0 }])
  })
})

describe('setJuz', () => {
  it('persists the juz start verse so a reload restores it', async () => {
    const store = usePlayerStore()
    store.loadSurah = async () => {
      // Juz 2 starts at Al-Baqara (2) verse 142.
      store.verses = Array.from({ length: 286 }, (_, i) => ({ number: i + 1, text: 'كلمة' }))
      store.translationVerses = store.verses.map(v => ({ number: v.number, text: 'x' }))
    }
    await store.setJuz(2)
    expect(store.currentSurahNum).toBe(2)
    expect(store.currentVerseIndex).toBe(141)
    const saved = JSON.parse(localStorage.getItem('quran-player-prefs'))
    expect(saved.verse).toBe(141)
  })
})

describe('setReciter', () => {
  it('keeps the current verse index across a reciter switch', async () => {
    const store = usePlayerStore()
    store.loadSurah = async () => {} // avoid real network in unit test
    store.currentSurahNum = 2
    store.verses = Array.from({ length: 286 }, (_, i) => ({ number: i + 1, text: 'كلمة' }))
    store.currentVerseIndex = 149
    await store.setReciter('sudais')
    expect(store.currentReciter).toBe('sudais')
    expect(store.currentVerseIndex).toBe(149)
  })

  it('persists the kept verse index so a reload restores it', async () => {
    const store = usePlayerStore()
    store.loadSurah = async () => {}
    store.verses = Array.from({ length: 286 }, (_, i) => ({ number: i + 1, text: 'كلمة' }))
    store.currentVerseIndex = 149
    await store.setReciter('sudais')
    const saved = JSON.parse(localStorage.getItem('quran-player-prefs'))
    expect(saved.reciter).toBe('sudais')
    expect(saved.verse).toBe(149)
  })

  it('resets the word highlight index because timings are reciter-specific', async () => {
    const store = usePlayerStore()
    store.loadSurah = async () => {}
    store.verses = [{ number: 1, text: 'كلمة كلمة' }]
    store.currentWordIndex = 1
    await store.setReciter('sudais')
    expect(store.currentWordIndex).toBe(-1)
  })

  it('clamps an out-of-range verse index through loadSurah', async () => {
    const store = usePlayerStore()
    // Prime the surah cache so the real loadSurah resolves synchronously and
    // exercises its clamp for indexes past the end of the surah.
    const verses = Array.from({ length: 3 }, (_, i) => ({ number: i + 1, text: 'كلمة' }))
    cacheSurah(store.currentSurahNum, store.currentTranslation, 'sudais', {
      verses,
      translationVerses: verses.map(v => ({ number: v.number, text: 'x' })),
      playbackMode: 'full',
      audioUrl: 'https://download.quranicaudio.com/quran/mock/001.mp3',
      audioDurationMs: 30000,
      verseTimings: [],
      audioUrls: []
    })
    store.currentVerseIndex = 10
    await store.setReciter('sudais')
    expect(store.currentVerseIndex).toBe(0)
  })
})

describe('offline downloads per reciter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetchOk() {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      clone() {
        return this
      },
      arrayBuffer: async () => new ArrayBuffer(0)
    }))
  }

  it('records the reciter with a download so another reciter is not marked downloaded', async () => {
    stubFetchOk()
    const store = usePlayerStore()
    store.currentSurahNum = 36
    store.currentReciter = 'alafasy'
    store.playbackMode = 'full'
    store.audioUrl = 'https://download.quranicaudio.com/quran/mock/036.mp3'
    await store.downloadCurrentSurah()
    expect(store.downloadedSurahs).toEqual([{ reciter: 'alafasy', surah: 36 }])
    expect(store.isCurrentDownloaded).toBe(true)

    store.currentReciter = 'sudais'
    expect(store.isCurrentDownloaded).toBe(false)

    store.currentReciter = 'alafasy'
    expect(store.isCurrentDownloaded).toBe(true)
  })

  it('does not duplicate an entry when the same reciter downloads a surah twice', async () => {
    stubFetchOk()
    const store = usePlayerStore()
    store.currentSurahNum = 36
    store.playbackMode = 'full'
    store.audioUrl = 'https://download.quranicaudio.com/quran/mock/036.mp3'
    await store.downloadCurrentSurah()
    await store.downloadCurrentSurah()
    expect(store.downloadedSurahs.length).toBe(1)
  })

  it('removes a download only for the current reciter', () => {
    const store = usePlayerStore()
    store.downloadedSurahs = [
      { reciter: 'alafasy', surah: 36 },
      { reciter: 'sudais', surah: 36 }
    ]
    store.currentReciter = 'alafasy'
    store.removeDownload(36)
    expect(store.downloadedSurahs).toEqual([{ reciter: 'sudais', surah: 36 }])
  })

  it('migrates v2 bare surah numbers to entries keyed by the stored reciter', () => {
    localStorage.setItem(
      'quran-player-prefs',
      JSON.stringify({ version: 2, reciter: 'sudais', downloadedSurahs: [36, 1] })
    )
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.downloadedSurahs).toEqual([
      { reciter: 'sudais', surah: 36 },
      { reciter: 'sudais', surah: 1 }
    ])
  })

  it('migrates v2 downloads to the default reciter when the stored reciter is invalid', () => {
    localStorage.setItem(
      'quran-player-prefs',
      JSON.stringify({ version: 2, reciter: 'does-not-exist', downloadedSurahs: [36] })
    )
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.downloadedSurahs).toEqual([{ reciter: 'alafasy', surah: 36 }])
  })

  it('drops malformed download entries on load', () => {
    localStorage.setItem(
      'quran-player-prefs',
      JSON.stringify({
        version: 3,
        downloadedSurahs: [
          { reciter: 'alafasy', surah: 36 },
          { reciter: 'does-not-exist', surah: 2 },
          { reciter: 'alafasy', surah: 999 },
          36,
          null
        ]
      })
    )
    const store = usePlayerStore()
    store.loadPreferences()
    expect(store.downloadedSurahs).toEqual([{ reciter: 'alafasy', surah: 36 }])
  })

  it('round-trips download entries through localStorage', () => {
    const store = usePlayerStore()
    store.downloadedSurahs = [{ reciter: 'sudais', surah: 36 }]
    store.writePreferencesNow()

    setActivePinia(createPinia())
    const fresh = usePlayerStore()
    fresh.loadPreferences()
    expect(fresh.downloadedSurahs).toEqual([{ reciter: 'sudais', surah: 36 }])
  })
})

describe('canPlayAudio', () => {
  it('is false when audio is unavailable', () => {
    const store = usePlayerStore()
    store.audioUnavailable = true
    store.playbackMode = 'full'
    store.audioUrl = 'https://download.quranicaudio.com/quran/test.mp3'
    expect(store.canPlayAudio).toBe(false)
  })

  it('is true for full mode with a URL', () => {
    const store = usePlayerStore()
    store.audioUnavailable = false
    store.playbackMode = 'full'
    store.audioUrl = 'https://download.quranicaudio.com/quran/test.mp3'
    expect(store.canPlayAudio).toBe(true)
  })

  it('is true for verse mode with URLs', () => {
    const store = usePlayerStore()
    store.audioUnavailable = false
    store.playbackMode = 'verse'
    store.audioUrls = ['https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3']
    expect(store.canPlayAudio).toBe(true)
  })
})
