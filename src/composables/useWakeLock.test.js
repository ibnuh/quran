import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useWakeLock } from './useWakeLock.js'

function createSentinel() {
  const listeners = {}
  return {
    release: vi.fn(() => Promise.resolve()),
    addEventListener: vi.fn((name, cb) => {
      listeners[name] = cb
    }),
    emitRelease() {
      listeners.release?.()
    }
  }
}

function mountWakeLock() {
  const isPlaying = ref(false)
  const Comp = defineComponent({
    setup() {
      useWakeLock(isPlaying)
      return {}
    },
    template: '<div />'
  })
  const wrapper = mount(Comp)
  return { wrapper, isPlaying }
}

// Let pending microtasks (awaited wakeLock.request) settle.
function flush() {
  return new Promise(r => setTimeout(r, 0))
}

describe('useWakeLock', () => {
  let wrapper
  let pending

  beforeEach(() => {
    pending = []
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: vi.fn(
          () =>
            new Promise((resolve, reject) => {
              pending.push({ resolve, reject })
            })
        )
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    delete navigator.wakeLock
    vi.clearAllMocks()
  })

  it('acquires a lock when playback starts and releases it on pause', async () => {
    const mounted = mountWakeLock()
    wrapper = mounted.wrapper

    mounted.isPlaying.value = true
    await nextTick()
    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1)

    const sentinel = createSentinel()
    pending[0].resolve(sentinel)
    await flush()

    mounted.isPlaying.value = false
    await nextTick()
    expect(sentinel.release).toHaveBeenCalledTimes(1)
  })

  it('releases a lock that resolves after playback already stopped', async () => {
    const mounted = mountWakeLock()
    wrapper = mounted.wrapper

    mounted.isPlaying.value = true
    await nextTick()
    // Pause while the request is still pending.
    mounted.isPlaying.value = false
    await nextTick()

    const sentinel = createSentinel()
    pending[0].resolve(sentinel)
    await flush()

    // The late lock must not be kept while paused.
    expect(sentinel.release).toHaveBeenCalledTimes(1)
  })

  it('keeps only the newest lock on rapid pause/play toggles', async () => {
    const mounted = mountWakeLock()
    wrapper = mounted.wrapper

    mounted.isPlaying.value = true
    await nextTick()
    mounted.isPlaying.value = false
    await nextTick()
    mounted.isPlaying.value = true
    await nextTick()
    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2)

    const first = createSentinel()
    const second = createSentinel()
    pending[0].resolve(first)
    pending[1].resolve(second)
    await flush()

    // The superseded first lock is released, the active one is kept.
    expect(first.release).toHaveBeenCalledTimes(1)
    expect(second.release).not.toHaveBeenCalled()

    mounted.isPlaying.value = false
    await nextTick()
    expect(second.release).toHaveBeenCalledTimes(1)
  })

  it('does not request a second lock while one is already held', async () => {
    const mounted = mountWakeLock()
    wrapper = mounted.wrapper

    mounted.isPlaying.value = true
    await nextTick()
    const sentinel = createSentinel()
    pending[0].resolve(sentinel)
    await flush()

    document.dispatchEvent(new Event('visibilitychange'))
    await flush()
    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1)
  })

  it('re-acquires on visibilitychange after the browser auto-released the lock', async () => {
    const mounted = mountWakeLock()
    wrapper = mounted.wrapper

    mounted.isPlaying.value = true
    await nextTick()
    const sentinel = createSentinel()
    pending[0].resolve(sentinel)
    await flush()

    // Backgrounding auto-releases; the sentinel fires its release event.
    sentinel.emitRelease()
    document.dispatchEvent(new Event('visibilitychange'))
    await flush()
    expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2)
  })

  it('releases the held lock on unmount', async () => {
    const mounted = mountWakeLock()
    wrapper = mounted.wrapper

    mounted.isPlaying.value = true
    await nextTick()
    const sentinel = createSentinel()
    pending[0].resolve(sentinel)
    await flush()

    wrapper.unmount()
    wrapper = null
    expect(sentinel.release).toHaveBeenCalledTimes(1)
  })
})
