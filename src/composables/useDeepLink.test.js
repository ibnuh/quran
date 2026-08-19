import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, reactive, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { parseLocation, buildVerseUrl, useUrlSync } from './useDeepLink.js'

let mockRoute
let mockRouter

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter
}))

function route(params = {}, query = {}) {
  return { params, query }
}

describe('parseLocation', () => {
  it('reads surah and ayah from path params', () => {
    expect(parseLocation(route({ surah: '2', ayah: '255' }))).toEqual({ surah: 2, ayah: 255 })
  })

  it('reads surah only', () => {
    expect(parseLocation(route({ surah: '36' }))).toEqual({ surah: 36, ayah: null })
  })

  it('falls back to the ?surah= query param', () => {
    expect(parseLocation(route({}, { surah: '18' }))).toEqual({ surah: 18, ayah: null })
  })

  it('rejects out-of-range surahs', () => {
    expect(parseLocation(route({ surah: '200' }))).toEqual({ surah: null, ayah: null })
    expect(parseLocation(route({ surah: '0' }))).toEqual({ surah: null, ayah: null })
  })

  it('returns nulls for the bare root', () => {
    expect(parseLocation(route())).toEqual({ surah: null, ayah: null })
  })
})

describe('buildVerseUrl', () => {
  it('builds a surah-only path', () => {
    expect(buildVerseUrl(2)).toBe('/2')
  })

  it('builds a surah/ayah path', () => {
    expect(buildVerseUrl(2, 255)).toBe('/2/255')
  })
})

describe('useUrlSync', () => {
  let wrapper
  let store
  let enabled

  function mountSync() {
    const Comp = defineComponent({
      setup() {
        useUrlSync(store, enabled)
        return {}
      },
      template: '<div />'
    })
    wrapper = mount(Comp)
  }

  async function settle() {
    await nextTick()
    vi.runAllTimers()
  }

  beforeEach(() => {
    vi.useFakeTimers()
    mockRoute = reactive({ path: '/' })
    mockRouter = {
      replace: vi.fn(path => {
        mockRoute.path = path
        return Promise.resolve()
      })
    }
    store = reactive({
      currentSurahNum: 1,
      currentVerse: { number: 1 },
      isLoading: false
    })
    enabled = ref(false)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('does not touch the router while disabled', async () => {
    mountSync()
    store.currentSurahNum = 2
    store.currentVerse = { number: 5 }
    await settle()
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it('replaces the URL once enabled and on verse changes', async () => {
    mountSync()
    enabled.value = true
    await settle()
    expect(mockRouter.replace).toHaveBeenCalledWith('/1/1')

    store.currentVerse = { number: 3 }
    await settle()
    expect(mockRouter.replace).toHaveBeenLastCalledWith('/1/3')
  })

  it('waits for loading to finish before syncing', async () => {
    enabled.value = true
    store.isLoading = true
    mountSync()
    store.currentSurahNum = 4
    await settle()
    expect(mockRouter.replace).not.toHaveBeenCalled()

    store.isLoading = false
    await settle()
    expect(mockRouter.replace).toHaveBeenCalledWith('/4/1')
  })

  it('skips the replace when the path already matches', async () => {
    mockRoute.path = '/2/5'
    store.currentSurahNum = 2
    store.currentVerse = { number: 5 }
    mountSync()
    enabled.value = true
    await settle()
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it('does nothing when no verse is loaded', async () => {
    store.currentVerse = null
    mountSync()
    enabled.value = true
    await settle()
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it('coalesces rapid navigation into one replace', async () => {
    mountSync()
    enabled.value = true
    await settle()
    mockRouter.replace.mockClear()

    for (let n = 2; n <= 7; n++) {
      store.currentVerse = { number: n }
      await nextTick()
    }
    vi.runAllTimers()

    expect(mockRouter.replace).toHaveBeenCalledTimes(1)
    expect(mockRouter.replace).toHaveBeenCalledWith('/1/7')
  })
})
