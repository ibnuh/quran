import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { stripBismillahFromVerse } from './api.js'

// Re-import after each mock setup is not needed; exercise via public fetch helpers.
import { fetchSurahText } from './api.js'

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
