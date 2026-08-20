import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useAudio } from './useAudio.js'

// iOS Safari ignores the HTMLMediaElement volume setter, so the mute-until-seek
// window must use the muted property instead of volume = 0. These tests assert
// that muted carries the seek window while volume stays at the user setting.

class FakeAudio {
  constructor() {
    this.preload = ''
    this.src = ''
    this.currentSrc = ''
    this.readyState = 0
    this.networkState = 1
    this.duration = NaN
    this.currentTime = 0
    this.paused = true
    this.error = null
    this.playbackRate = 1
    this.volume = 1
    this.muted = false
    this.buffered = { length: 0 }
    this._listeners = new Map()
    FakeAudio.instances.push(this)
  }

  addEventListener(name, cb) {
    if (!this._listeners.has(name)) {
      this._listeners.set(name, [])
    }
    this._listeners.get(name).push(cb)
  }

  removeEventListener(name, cb) {
    const cbs = this._listeners.get(name)
    if (cbs) {
      const i = cbs.indexOf(cb)
      if (i !== -1) {
        cbs.splice(i, 1)
      }
    }
  }

  dispatch(name) {
    for (const cb of [...(this._listeners.get(name) || [])]) {
      cb()
    }
  }

  play() {
    this.paused = false
    return Promise.resolve()
  }

  pause() {
    this.paused = true
  }

  load() {
    this.currentSrc = this.src
  }

  removeAttribute(name) {
    if (name === 'src') {
      this.src = ''
      this.currentSrc = ''
    }
  }
}
FakeAudio.instances = []

function mountAudio() {
  let api = null
  const Comp = defineComponent({
    setup() {
      api = useAudio()
      return {}
    },
    template: '<div />'
  })
  const wrapper = mount(Comp)
  return { wrapper, api }
}

const URL_A = 'https://audio.test/surah-2.mp3'

describe('useAudio mute-until-seek', () => {
  let wrapper

  beforeEach(() => {
    FakeAudio.instances = []
    vi.stubGlobal('Audio', FakeAudio)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('uses muted (not volume) while a mid-file seek is pending', async () => {
    const mounted = mountAudio()
    wrapper = mounted.wrapper
    const el = FakeAudio.instances[0]
    el.readyState = 4
    el.duration = 100

    mounted.api.setVolume(0.8)
    const ok = await mounted.api.playAt(URL_A, 5000)

    expect(ok).toBe(true)
    expect(el.muted).toBe(true)
    // The user volume must never be clobbered to 0 for the mute window,
    // because iOS Safari ignores the volume setter entirely.
    expect(el.volume).toBe(0.8)
  })

  it('unmutes once the seek lands at the target', async () => {
    const mounted = mountAudio()
    wrapper = mounted.wrapper
    const el = FakeAudio.instances[0]
    el.readyState = 4
    el.duration = 100

    mounted.api.setVolume(0.8)
    await mounted.api.playAt(URL_A, 5000)
    expect(el.muted).toBe(true)

    el.dispatch('seeked')

    expect(el.muted).toBe(false)
    expect(el.volume).toBe(0.8)
  })

  it('does not mute for near-start playback', async () => {
    const mounted = mountAudio()
    wrapper = mounted.wrapper
    const el = FakeAudio.instances[0]
    el.readyState = 4
    el.duration = 100

    mounted.api.setVolume(0.8)
    await mounted.api.playAt(URL_A, 100)

    expect(el.muted).toBe(false)
    expect(el.volume).toBe(0.8)
  })

  it('re-applies muted on the fresh element when recreateAudio runs mid-window', async () => {
    const mounted = mountAudio()
    wrapper = mounted.wrapper
    const el1 = FakeAudio.instances[0]
    // Poisoned element forces playAt to recreate before playing.
    el1.error = { code: 3, message: 'decode' }

    mounted.api.setVolume(0.8)
    await mounted.api.playAt(URL_A, 5000)

    expect(FakeAudio.instances.length).toBeGreaterThan(1)
    const el2 = FakeAudio.instances[FakeAudio.instances.length - 1]
    expect(el2.muted).toBe(true)
    expect(el2.volume).toBe(0.8)

    // Buffer arrives, the queued seek applies, then the seek settles.
    el2.readyState = 4
    el2.duration = 100
    el2.dispatch('canplay')
    expect(el2.currentTime).toBe(5)
    expect(el2.muted).toBe(true)

    el2.dispatch('seeked')
    expect(el2.muted).toBe(false)
    expect(el2.volume).toBe(0.8)
  })

  it('keeps muted while the user changes volume during the seek window', async () => {
    const mounted = mountAudio()
    wrapper = mounted.wrapper
    const el = FakeAudio.instances[0]
    el.readyState = 4
    el.duration = 100

    mounted.api.setVolume(0.8)
    await mounted.api.playAt(URL_A, 5000)
    expect(el.muted).toBe(true)

    mounted.api.setVolume(0.5)
    expect(el.muted).toBe(true)
    expect(el.volume).toBe(0.5)

    el.dispatch('seeked')
    expect(el.muted).toBe(false)
    expect(el.volume).toBe(0.5)
  })
})
