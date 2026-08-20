import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { stripBismillahFromVerse } from './api.js'

// Re-import after each mock setup is not needed; exercise via public fetch helpers.
import { fetchSurahText } from './api.js'
import { MAX_RETRIES, RETRY_DELAY, FETCH_TIMEOUT } from '../config.js'

describe('stripBismillahFromVerse', () => {
  it('strips the leading 4-word Bismillah', () => {
    const bismillah = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'
    const rest = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'
    expect(stripBismillahFromVerse(`${bismillah} ${rest}`)).toBe(rest)
  })

  it('leaves text without a leading baa untouched', () => {
    const text = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'
    expect(stripBismillahFromVerse(text)).toBe(text)
  })

  it('leaves short verses untouched', () => {
    const text = 'بِسْمِ اللَّهِ'
    expect(stripBismillahFromVerse(text)).toBe(text)
  })
})

describe('fetchJsonDeduped abort isolation (via fetchSurahText)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('does not abort a shared inflight request when one consumer aborts', async () => {
    let resolveFetch
    const fetchPromise = new Promise(resolve => {
      resolveFetch = resolve
    })
    const fetchMock = vi.fn(() => fetchPromise)
    vi.stubGlobal('fetch', fetchMock)

    const controllerA = new AbortController()
    const controllerB = new AbortController()

    const pA = fetchSurahText(1, 'en.itani', controllerA.signal)
    const pB = fetchSurahText(1, 'en.itani', controllerB.signal)

    // One network call for both consumers.
    expect(fetchMock).toHaveBeenCalledTimes(1)

    controllerA.abort()
    await expect(pA).rejects.toMatchObject({ name: 'AbortError' })

    resolveFetch({
      ok: true,
      json: async () => ({
        code: 200,
        data: [
          { ayahs: [{ numberInSurah: 1, text: 'بِسْمِ' }] },
          { ayahs: [{ numberInSurah: 1, text: 'In the name' }] }
        ]
      })
    })

    const result = await pB
    expect(result.verses).toHaveLength(1)
    expect(result.translationVerses[0].text).toBe('In the name')
  })
})

describe('fetchWithRetry per-attempt timeout (via fetchSurahText)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  // Simulates a stalled response: never settles unless the fetch signal aborts.
  const stalledFetch = (url, options) =>
    new Promise((resolve, reject) => {
      options?.signal?.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted.', 'AbortError'))
      )
    })

  const okSurahResponse = () => ({
    ok: true,
    json: async () => ({
      code: 200,
      data: [
        { ayahs: [{ numberInSurah: 1, text: 'بِسْمِ' }] },
        { ayahs: [{ numberInSurah: 1, text: 'In the name' }] }
      ]
    })
  })

  it('times out a stalled attempt, retries, and surfaces a network ApiError', async () => {
    const fetchMock = vi.fn(stalledFetch)
    vi.stubGlobal('fetch', fetchMock)

    const p = fetchSurahText(2, 'en.itani')
    const assertion = expect(p).rejects.toMatchObject({ name: 'ApiError', kind: 'network' })

    await vi.runAllTimersAsync()
    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(MAX_RETRIES + 1)
  })

  it('recovers when a retry succeeds after the first attempt stalls', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(stalledFetch)
      .mockImplementation(async () => okSurahResponse())
    vi.stubGlobal('fetch', fetchMock)

    const p = fetchSurahText(3, 'en.itani')
    // First attempt hits its deadline, then the retry backoff elapses.
    await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT)
    await vi.advanceTimersByTimeAsync(RETRY_DELAY)

    const result = await p
    expect(result.translationVerses[0].text).toBe('In the name')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('propagates a caller abort as AbortError and does not retry', async () => {
    const fetchMock = vi.fn(stalledFetch)
    vi.stubGlobal('fetch', fetchMock)

    const controller = new AbortController()
    const p = fetchSurahText(4, 'en.itani', controller.signal)

    controller.abort()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })

    await vi.runAllTimersAsync()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
