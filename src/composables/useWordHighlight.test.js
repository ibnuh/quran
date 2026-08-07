import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useWordHighlight } from './useWordHighlight.js'
import { setUiLocale } from '../i18n/index.js'

function createAudioMock({ timeMs = 0, duration = 10000, playing = false } = {}) {
  let timeUpdateCb = null
  return {
    isPlaying: ref(playing),
    duration: ref(duration),
    progress: ref(0),
    currentTimeMs: ref(timeMs),
    getLiveTimeMs: vi.fn(() => timeMs),
    isVerseSeekActive: vi.fn(() => false),
    onTimeUpdate(cb) {
      timeUpdateCb = cb
    },
    emitTimeUpdate(ms) {
      if (timeUpdateCb) {
        timeUpdateCb(ms)
      }
    },
    setTimeMs(ms) {
      timeMs = ms
      this.getLiveTimeMs.mockReturnValue(ms)
    }
  }
}

function createStoreMock(overrides = {}) {
  return {
    currentSurah: { englishName: 'Al-Faatiha' },
    currentVerse: { number: 1 },
    totalVerses: 7,
    currentVerseIndex: 0,
    currentWordIndex: -1,
    playbackMode: 'full',
    wordHighlight: true,
    getVerseIndexAtTime: vi.fn(() => 0),
    getWordIndexAtTime: vi.fn(() => 0),
    savePreferences: vi.fn(),
    ...overrides
  }
}

function mountHighlight(store, audio, announce) {
  const Comp = defineComponent({
    setup() {
      useWordHighlight(store, audio, announce)
      return {}
    },
    template: '<div />'
  })
  return mount(Comp)
}

describe('useWordHighlight', () => {
  let wrapper
  let rafCallbacks
  let originalRaf
  let originalCancel

  beforeEach(() => {
    setActivePinia(createPinia())
    setUiLocale('en')
    rafCallbacks = []
    originalRaf = globalThis.requestAnimationFrame
    originalCancel = globalThis.cancelAnimationFrame
    globalThis.requestAnimationFrame = cb => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    }
    globalThis.cancelAnimationFrame = id => {
      rafCallbacks[id - 1] = null
    }
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    globalThis.requestAnimationFrame = originalRaf
    globalThis.cancelAnimationFrame = originalCancel
    vi.useRealTimers()
  })

  it('announces verse changes with i18n text', async () => {
    const announce = vi.fn()
    const store = createStoreMock({
      getVerseIndexAtTime: vi.fn(ms => (ms >= 1000 ? 1 : 0)),
      getWordIndexAtTime: vi.fn(() => -1)
    })
    const audio = createAudioMock({ playing: false })
    wrapper = mountHighlight(store, audio, announce)
    await nextTick()

    audio.emitTimeUpdate(1500)

    expect(store.currentVerseIndex).toBe(1)
    expect(announce).toHaveBeenCalledTimes(1)
    expect(announce.mock.calls[0][0]).toBe('Verse 1 of 7, Al-Faatiha')
  })

  it('only writes currentWordIndex when the value changes', async () => {
    const announce = vi.fn()
    const store = createStoreMock({
      getVerseIndexAtTime: vi.fn(() => 0),
      getWordIndexAtTime: vi.fn(() => 2)
    })
    // Track assignment attempts via a setter proxy
    let writeCount = 0
    let wordIndex = -1
    Object.defineProperty(store, 'currentWordIndex', {
      configurable: true,
      enumerable: true,
      get() {
        return wordIndex
      },
      set(v) {
        writeCount++
        wordIndex = v
      }
    })

    const audio = createAudioMock({ playing: false })
    wrapper = mountHighlight(store, audio, announce)
    await nextTick()

    audio.emitTimeUpdate(100)
    expect(writeCount).toBe(1)
    expect(store.currentWordIndex).toBe(2)

    // Same word index again: no extra store write
    audio.emitTimeUpdate(200)
    expect(writeCount).toBe(1)
    expect(store.currentWordIndex).toBe(2)

    store.getWordIndexAtTime.mockReturnValue(3)
    audio.emitTimeUpdate(300)
    expect(writeCount).toBe(2)
    expect(store.currentWordIndex).toBe(3)
  })

  it('starts RAF loop when playing with word highlight in full mode', async () => {
    const announce = vi.fn()
    const store = createStoreMock()
    const audio = createAudioMock({ playing: true, timeMs: 50 })
    store.getWordIndexAtTime = vi.fn(() => 1)

    wrapper = mountHighlight(store, audio, announce)
    await nextTick()

    // Watch may not fire on mount for initial values unless immediate; drive play toggle.
    audio.isPlaying.value = false
    await nextTick()
    audio.isPlaying.value = true
    await nextTick()

    expect(rafCallbacks.some(Boolean)).toBe(true)

    // Run one tick
    const tick = rafCallbacks.find(Boolean)
    if (tick) {
      tick()
    }
    expect(store.currentWordIndex).toBe(1)
  })
})
