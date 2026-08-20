import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useMediaSession } from './useMediaSession.js'

function createStoreMock(overrides = {}) {
  return reactive({
    currentSurahNum: 2,
    currentReciter: 'alafasy',
    currentVerseIndex: 0,
    totalVerses: 3,
    playbackMode: 'full',
    currentSurah: { englishName: 'Al-Baqara', englishNameTranslation: 'The Cow' },
    currentVerse: { number: 1 },
    currentReciterData: { name: 'Reciter' },
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
    ...overrides
  })
}

function createAudioMock(overrides = {}) {
  return {
    isPlaying: ref(false),
    duration: ref(100000),
    currentTimeMs: ref(30000),
    playbackRate: ref(1),
    ...overrides
  }
}

function mountMediaSession(store, handlers, audio = null) {
  let session = null
  const Comp = defineComponent({
    setup() {
      session = useMediaSession(store, handlers, audio)
      return {}
    },
    template: '<div />'
  })
  const wrapper = mount(Comp)
  return { wrapper, session }
}

describe('useMediaSession actions', () => {
  let wrapper
  let actionHandlers

  beforeEach(() => {
    actionHandlers = {}
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: {
        metadata: null,
        playbackState: 'none',
        setActionHandler: (name, cb) => {
          actionHandlers[name] = cb
        },
        setPositionState: vi.fn()
      }
    })
    globalThis.MediaMetadata = class {
      constructor(init) {
        Object.assign(this, init)
      }
    }
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    delete navigator.mediaSession
    delete globalThis.MediaMetadata
    vi.clearAllMocks()
  })

  function bind(store, handlers, audio = null) {
    const mounted = mountMediaSession(store, handlers, audio)
    wrapper = mounted.wrapper
    mounted.session.update()
  }

  it('nexttrack advances a verse mid-surah', () => {
    const handlers = {
      togglePlay: vi.fn(),
      nextVerse: vi.fn(),
      prevVerse: vi.fn(),
      nextSurah: vi.fn(),
      prevSurah: vi.fn()
    }
    bind(createStoreMock({ currentVerseIndex: 0 }), handlers)

    actionHandlers.nexttrack()

    expect(handlers.nextVerse).toHaveBeenCalledTimes(1)
    expect(handlers.nextSurah).not.toHaveBeenCalled()
  })

  it('nexttrack falls back to the next surah at the last verse', () => {
    const handlers = {
      togglePlay: vi.fn(),
      nextVerse: vi.fn(),
      prevVerse: vi.fn(),
      nextSurah: vi.fn(),
      prevSurah: vi.fn()
    }
    bind(createStoreMock({ currentVerseIndex: 2 }), handlers)

    actionHandlers.nexttrack()

    expect(handlers.nextVerse).not.toHaveBeenCalled()
    expect(handlers.nextSurah).toHaveBeenCalledTimes(1)
  })

  it('nexttrack does nothing at the last verse of the last surah', () => {
    const handlers = {
      togglePlay: vi.fn(),
      nextVerse: vi.fn(),
      prevVerse: vi.fn(),
      nextSurah: vi.fn(),
      prevSurah: vi.fn()
    }
    bind(createStoreMock({ currentSurahNum: 114, currentVerseIndex: 2 }), handlers)

    actionHandlers.nexttrack()

    expect(handlers.nextVerse).not.toHaveBeenCalled()
    expect(handlers.nextSurah).not.toHaveBeenCalled()
  })

  it('previoustrack falls back to the previous surah at the first verse', () => {
    const handlers = {
      togglePlay: vi.fn(),
      nextVerse: vi.fn(),
      prevVerse: vi.fn(),
      nextSurah: vi.fn(),
      prevSurah: vi.fn()
    }
    bind(createStoreMock({ currentVerseIndex: 0 }), handlers)

    actionHandlers.previoustrack()

    expect(handlers.prevVerse).not.toHaveBeenCalled()
    expect(handlers.prevSurah).toHaveBeenCalledTimes(1)
  })

  it('seekto scrubs the full-surah file to the requested time', () => {
    const handlers = { togglePlay: vi.fn(), seek: vi.fn() }
    bind(createStoreMock(), handlers, createAudioMock({ duration: ref(100000) }))

    actionHandlers.seekto({ seekTime: 25 })

    expect(handlers.seek).toHaveBeenCalledTimes(1)
    expect(handlers.seek).toHaveBeenCalledWith(0.25)
  })

  it('seekto is inert in verse mode', () => {
    const handlers = { togglePlay: vi.fn(), seek: vi.fn() }
    bind(createStoreMock({ playbackMode: 'verse' }), handlers, createAudioMock())

    actionHandlers.seekto({ seekTime: 25 })

    expect(handlers.seek).not.toHaveBeenCalled()
  })

  it('seekto ignores events without a finite seekTime and works without audio wired', () => {
    const handlers = { togglePlay: vi.fn(), seek: vi.fn() }
    bind(createStoreMock(), handlers, createAudioMock())

    actionHandlers.seekto({})

    expect(handlers.seek).not.toHaveBeenCalled()

    wrapper.unmount()
    bind(createStoreMock(), handlers)

    expect(() => actionHandlers.seekto({ seekTime: 25 })).not.toThrow()
    expect(handlers.seek).not.toHaveBeenCalled()
  })

  it('seekbackward steps back by the provided offset', () => {
    const handlers = { togglePlay: vi.fn(), seek: vi.fn() }
    const audio = createAudioMock({ duration: ref(100000), currentTimeMs: ref(30000) })
    bind(createStoreMock(), handlers, audio)

    actionHandlers.seekbackward({ seekOffset: 5 })

    expect(handlers.seek).toHaveBeenCalledWith(0.25)
  })

  it('seekbackward defaults to 10 seconds and clamps at the start', () => {
    const handlers = { togglePlay: vi.fn(), seek: vi.fn() }
    const audio = createAudioMock({ duration: ref(100000), currentTimeMs: ref(4000) })
    bind(createStoreMock(), handlers, audio)

    actionHandlers.seekbackward({})

    expect(handlers.seek).toHaveBeenCalledWith(0)
  })

  it('seekforward defaults to 10 seconds and clamps at the end', () => {
    const handlers = { togglePlay: vi.fn(), seek: vi.fn() }
    const audio = createAudioMock({ duration: ref(100000), currentTimeMs: ref(95000) })
    bind(createStoreMock(), handlers, audio)

    actionHandlers.seekforward({})

    expect(handlers.seek).toHaveBeenCalledWith(1)
  })

  it('seekforward and seekbackward are inert in verse mode', () => {
    const handlers = { togglePlay: vi.fn(), seek: vi.fn() }
    bind(createStoreMock({ playbackMode: 'verse' }), handlers, createAudioMock())

    actionHandlers.seekforward({})
    actionHandlers.seekbackward({})

    expect(handlers.seek).not.toHaveBeenCalled()
  })
})
