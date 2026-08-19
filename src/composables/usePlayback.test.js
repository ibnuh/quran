import { describe, it, expect, afterEach, vi } from 'vitest'
import { defineComponent, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { usePlayback } from './usePlayback.js'

function createStoreMock(overrides = {}) {
  return reactive({
    currentSurahNum: 1,
    currentReciter: 'alafasy',
    currentVerseIndex: 0,
    currentWordIndex: -1,
    totalVerses: 3,
    playbackMode: 'full',
    audioUrl: 'https://audio.test/1.mp3',
    audioUrls: [],
    audioDurationMs: 30000,
    verseTimings: [
      { timestampFrom: 0, timestampTo: 10000 },
      { timestampFrom: 10000, timestampTo: 20000 },
      { timestampFrom: 20000, timestampTo: 30000 }
    ],
    playbackSpeed: 1,
    volume: 1,
    repeatMode: 'none',
    abRepeat: null,
    isLoading: false,
    error: null,
    audioUnavailable: false,
    get canNextVerse() {
      return this.currentVerseIndex < this.totalVerses - 1
    },
    get canPrevVerse() {
      return this.currentVerseIndex > 0
    },
    get canNextSurah() {
      return this.currentSurahNum < 114
    },
    get canPrevSurah() {
      return this.currentSurahNum > 1
    },
    get canPlayAudio() {
      return !this.audioUnavailable && !!this.playbackMode
    },
    nextVerse() {
      if (this.canNextVerse) {
        this.currentVerseIndex++
      }
    },
    prevVerse() {
      if (this.canPrevVerse) {
        this.currentVerseIndex--
      }
    },
    setVerse(i) {
      if (i >= 0 && i < this.totalVerses) {
        this.currentVerseIndex = i
      }
    },
    nextSurah: vi.fn(),
    prevSurah: vi.fn(),
    preloadNextSurah: vi.fn(),
    getVerseIndexAtTime: vi.fn(() => 0),
    savePreferences: vi.fn(),
    ...overrides
  })
}

function createAudioMock({ playing = false } = {}) {
  return {
    isPlaying: ref(playing),
    isSeeking: ref(false),
    currentTimeMs: ref(0),
    duration: ref(30000),
    loadAndPlay: vi.fn(() => Promise.resolve(true)),
    playAt: vi.fn(() => Promise.resolve(true)),
    load: vi.fn(),
    seekTo: vi.fn(),
    seek: vi.fn(() => null),
    stop: vi.fn(),
    pause: vi.fn(),
    setExpectedDuration: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    isVerseSeekActive: vi.fn(() => false),
    isHealthy: vi.fn(() => true),
    hasMediaError: vi.fn(() => false),
    onEnded: vi.fn(),
    onTimeUpdate: vi.fn()
  }
}

function mountPlayback(store, audio) {
  let playback = null
  const Comp = defineComponent({
    setup() {
      playback = usePlayback(store, audio)
      return {}
    },
    template: '<div />'
  })
  const wrapper = mount(Comp)
  return { wrapper, playback }
}

describe('usePlayback verse navigation', () => {
  let wrapper

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    vi.clearAllMocks()
  })

  it('advances and seeks to the next verse in full mode', () => {
    const store = createStoreMock({ currentVerseIndex: 0 })
    const audio = createAudioMock({ playing: true })
    const mounted = mountPlayback(store, audio)
    wrapper = mounted.wrapper

    mounted.playback.handleNextVerse()

    expect(store.currentVerseIndex).toBe(1)
    expect(audio.seekTo).toHaveBeenCalledWith(10000)
  })

  it('does nothing on next-verse at the last verse (full mode)', () => {
    const store = createStoreMock({ currentVerseIndex: 2 })
    const audio = createAudioMock({ playing: true })
    const mounted = mountPlayback(store, audio)
    wrapper = mounted.wrapper

    mounted.playback.handleNextVerse()

    expect(store.currentVerseIndex).toBe(2)
    expect(audio.seekTo).not.toHaveBeenCalled()
    expect(audio.loadAndPlay).not.toHaveBeenCalled()
  })

  it('does not restart the last verse on next-verse in verse mode', () => {
    const store = createStoreMock({
      currentVerseIndex: 2,
      playbackMode: 'verse',
      audioUrl: null,
      audioUrls: [
        'https://audio.test/a.mp3',
        'https://audio.test/b.mp3',
        'https://audio.test/c.mp3'
      ]
    })
    const audio = createAudioMock({ playing: true })
    const mounted = mountPlayback(store, audio)
    wrapper = mounted.wrapper

    mounted.playback.handleNextVerse()

    expect(store.currentVerseIndex).toBe(2)
    expect(audio.loadAndPlay).not.toHaveBeenCalled()
  })

  it('prev-verse at the first verse restarts it from its start (full mode)', () => {
    const store = createStoreMock({ currentVerseIndex: 0 })
    const audio = createAudioMock({ playing: true })
    const mounted = mountPlayback(store, audio)
    wrapper = mounted.wrapper

    mounted.playback.handlePrevVerse()

    expect(store.currentVerseIndex).toBe(0)
    expect(audio.seekTo).toHaveBeenCalledWith(0)
  })
})
