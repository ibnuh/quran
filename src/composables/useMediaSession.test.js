import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { useMediaSession } from './useMediaSession.js'

function createStoreMock(overrides = {}) {
  return reactive({
    currentSurahNum: 2,
    currentReciter: 'alafasy',
    currentVerseIndex: 0,
    totalVerses: 3,
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

function mountMediaSession(store, handlers) {
  let session = null
  const Comp = defineComponent({
    setup() {
      session = useMediaSession(store, handlers)
      return {}
    },
    template: '<div />'
  })
  const wrapper = mount(Comp)
  return { wrapper, session }
}

describe('useMediaSession track actions', () => {
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

  function bind(store, handlers) {
    const mounted = mountMediaSession(store, handlers)
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
})
