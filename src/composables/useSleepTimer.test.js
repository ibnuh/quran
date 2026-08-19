import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useSleepTimer } from './useSleepTimer.js'

function mountTimer(onExpire) {
  let timer
  const Comp = defineComponent({
    setup() {
      timer = useSleepTimer(onExpire)
      return {}
    },
    template: '<div />'
  })
  const wrapper = mount(Comp)
  return { wrapper, timer }
}

describe('useSleepTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires onExpire once after the requested minutes', () => {
    const onExpire = vi.fn()
    const { wrapper, timer } = mountTimer(onExpire)

    timer.start(5)
    expect(timer.activeMinutes.value).toBe(5)

    vi.advanceTimersByTime(5 * 60000 - 1000)
    expect(onExpire).not.toHaveBeenCalled()

    vi.advanceTimersByTime(2000)
    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(timer.activeMinutes.value).toBe(0)
    expect(timer.remainingMs.value).toBe(0)

    // No stray second fire from the interval safety net.
    vi.advanceTimersByTime(60000)
    expect(onExpire).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('updates remainingMs as time passes', () => {
    const onExpire = vi.fn()
    const { wrapper, timer } = mountTimer(onExpire)

    timer.start(10)
    expect(timer.remainingMs.value).toBe(10 * 60000)

    vi.advanceTimersByTime(60000)
    expect(timer.remainingMs.value).toBe(9 * 60000)
    wrapper.unmount()
  })

  it('expires from the interval check when the timeout is delayed past the deadline', () => {
    const onExpire = vi.fn()
    const { wrapper, timer } = mountTimer(onExpire)

    timer.start(5)

    // Simulate background timer throttling: wall clock jumps past the deadline
    // while only the 1s interval tick runs (the long timeout has not fired yet).
    vi.setSystemTime(Date.now() + 20 * 60000)
    vi.advanceTimersByTime(1000)

    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(timer.activeMinutes.value).toBe(0)
    wrapper.unmount()
  })

  it('cancel stops the countdown without firing onExpire', () => {
    const onExpire = vi.fn()
    const { wrapper, timer } = mountTimer(onExpire)

    timer.start(5)
    timer.cancel()
    expect(timer.activeMinutes.value).toBe(0)

    vi.advanceTimersByTime(10 * 60000)
    expect(onExpire).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('restarting replaces the previous countdown', () => {
    const onExpire = vi.fn()
    const { wrapper, timer } = mountTimer(onExpire)

    timer.start(5)
    vi.advanceTimersByTime(60000)
    timer.start(10)

    // The original 5 minute deadline passes without firing.
    vi.advanceTimersByTime(5 * 60000)
    expect(onExpire).not.toHaveBeenCalled()

    vi.advanceTimersByTime(5 * 60000)
    expect(onExpire).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
