import {
  TEXT_API,
  AUDIO_API,
  QURANCOM_API,
  MAX_RETRIES,
  RETRY_DELAY,
  SURAH_CACHE_MAX
} from '../config.js'
import { parseTranslationText } from '../utils/translationText.js'

// Error with a machine-readable kind so the UI can show specific, actionable messages.
export class ApiError extends Error {
  constructor(kind, message, status) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind // 'network' | 'not-found' | 'invalid' | 'http'
    this.status = status
  }
}

async function fetchWithRetry(url, retries = MAX_RETRIES, signal) {
  let lastErr = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, signal ? { signal } : undefined)
      if (!res.ok) {
        if (res.status === 404) {
          throw new ApiError('not-found', `Not found (HTTP 404)`, 404)
        }
        throw new ApiError('http', `HTTP ${res.status}`, res.status)
      }
      return res
    } catch (err) {
      if (err.name === 'AbortError') {
        throw err
      }
      // 404 is not transient; do not retry.
      if (err instanceof ApiError && err.kind === 'not-found') {
        throw err
      }
      lastErr = err
      if (attempt === retries) {
        break
      }
      await new Promise(r => setTimeout(r, RETRY_DELAY * Math.pow(2, attempt)))
    }
  }
  if (lastErr instanceof ApiError) {
    throw lastErr
  }
  throw new ApiError('network', lastErr?.message || 'Network request failed')
}

// Deduplicate concurrent identical GETs so loadSurah and preloadNextSurah do not
// fetch the same resource twice.
const inflight = new Map()

async function fetchJsonDeduped(url, signal) {
  if (inflight.has(url)) {
    return inflight.get(url)
  }
  const promise = (async () => {
    const res = await fetchWithRetry(url, MAX_RETRIES, signal)
    return res.json()
  })()
  inflight.set(url, promise)
  try {
    return await promise
  } finally {
    inflight.delete(url)
  }
}

// LRU cache for loaded surahs.
const surahCache = new Map()

function getCacheKey(surahNum, translationId, reciterId) {
  return `${surahNum}:${translationId}:${reciterId}`
}

export function getCachedSurah(surahNum, translationId, reciterId) {
  return surahCache.get(getCacheKey(surahNum, translationId, reciterId)) || null
}

export function cacheSurah(surahNum, translationId, reciterId, data) {
  const key = getCacheKey(surahNum, translationId, reciterId)
  if (surahCache.has(key)) {
    surahCache.delete(key)
  }
  if (surahCache.size >= SURAH_CACHE_MAX) {
    const oldest = surahCache.keys().next().value
    surahCache.delete(oldest)
  }
  surahCache.set(key, data)
}

// Strip the leading Bismillah (first 4 words) from verse 1 of every surah except
// Al-Faatiha (1) and At-Tawbah (9). The regex approach broke due to diacritical
// mark ordering, so we strip by word count after verifying it starts with baa.
export function stripBismillahFromVerse(text) {
  const words = text.split(/\s+/)
  if (words.length > 4 && /^ب/.test(words[0])) {
    return words.slice(4).join(' ')
  }
  return text
}

export async function fetchSurahText(surahNumber, translationId, signal) {
  const url = `${TEXT_API}/surah/${surahNumber}/editions/quran-uthmani,${translationId}`
  const data = await fetchJsonDeduped(url, signal)

  if (data.code !== 200 || !Array.isArray(data.data) || data.data.length < 2) {
    throw new ApiError('invalid', 'Invalid text API response')
  }

  const [arabicData, translationData] = data.data
  if (!Array.isArray(arabicData?.ayahs) || !Array.isArray(translationData?.ayahs)) {
    throw new ApiError('invalid', 'Malformed verse data')
  }
  const stripBismillah = surahNumber !== 1 && surahNumber !== 9

  return {
    // Keep the canonical Uthmani code points intact (e.g. U+0649 alef maqsura);
    // any font-specific display substitution happens at render time, not here, so
    // copy, share, and search use the original text.
    verses: arabicData.ayahs.map(a => {
      let text = a.text
      if (stripBismillah && a.numberInSurah === 1) {
        text = stripBismillahFromVerse(text)
      }
      return { number: a.numberInSurah, text }
    }),
    translationVerses: translationData.ayahs.map(a => ({
      number: a.numberInSurah,
      text: a.text
    }))
  }
}

export async function fetchSurahAudio(cdnReciterId, chapterNumber, signal) {
  const url = `${AUDIO_API}/${cdnReciterId}/audio_files?chapter=${chapterNumber}&segments=true`
  const data = await fetchJsonDeduped(url, signal)

  if (!data.audio_files || !data.audio_files.length) {
    throw new ApiError('invalid', 'No audio data available')
  }

  const file = data.audio_files[0]
  if (!file.audio_url) {
    throw new ApiError('invalid', 'Audio file URL missing')
  }

  return {
    audioUrl: file.audio_url,
    duration: file.duration,
    verseTimings: (file.verse_timings || []).map(vt => ({
      verseKey: vt.verse_key,
      timestampFrom: vt.timestamp_from,
      timestampTo: vt.timestamp_to,
      segments: (vt.segments || [])
        .filter(
          s => Array.isArray(s) && s.length >= 3 && s[0] != null && s[1] != null && s[2] != null
        )
        .map(s => ({
          wordIndex: s[0] - 1,
          from: s[1],
          to: s[2]
        }))
    }))
  }
}

export async function fetchVerseAudio(cloudReciterId, surahNumber, signal) {
  const url = `${TEXT_API}/surah/${surahNumber}/${cloudReciterId}`
  const data = await fetchJsonDeduped(url, signal)

  if (data.code !== 200 || !data.data || !Array.isArray(data.data.ayahs)) {
    throw new ApiError('invalid', 'Invalid verse audio response')
  }

  return {
    audioUrls: data.data.ayahs.map(a => a.audio)
  }
}

// Tajweed-annotated Uthmani text from quran.com (HTML with <tajweed class=...> spans).
// Bismillah is already excluded for verse 1, matching the rest of the pipeline.
export async function fetchSurahTajweed(surahNumber, signal) {
  const url = `${QURANCOM_API}/verses/by_chapter/${surahNumber}?fields=text_uthmani_tajweed&per_page=300`
  const data = await fetchJsonDeduped(url, signal)

  if (!data.verses || !data.verses.length) {
    throw new ApiError('invalid', 'Invalid tajweed response')
  }

  return {
    tajweedVerses: data.verses.map(v => v.text_uthmani_tajweed || '')
  }
}

// Fetch one or more additional translation editions (alquran.cloud) for a surah.
// Returns parallel verse arrays so they can be stacked under the primary translation.
export async function fetchTranslations(surahNumber, editionIds, signal) {
  if (!editionIds.length) {
    return { translations: [] }
  }
  const url = `${TEXT_API}/surah/${surahNumber}/editions/${editionIds.join(',')}`
  const data = await fetchJsonDeduped(url, signal)
  if (data.code !== 200 || !Array.isArray(data.data)) {
    throw new ApiError('invalid', 'Invalid translations response')
  }
  return {
    translations: data.data
      .filter(ed => Array.isArray(ed?.ayahs))
      .map(ed => ({
        id: ed.edition?.identifier,
        name: ed.edition?.englishName || ed.edition?.name || ed.edition?.identifier,
        verses: ed.ayahs.map(a => ({ number: a.numberInSurah, text: a.text }))
      }))
  }
}

// QCF v2 mushaf glyph data from quran.com: per verse, the words with their glyph code
// point (code_v2) and page (v2_page) so they can be rendered in the page's glyph font.
export async function fetchSurahQcf(surahNumber, signal) {
  const url = `${QURANCOM_API}/verses/by_chapter/${surahNumber}?words=true&word_fields=code_v2,v2_page&per_page=300`
  const data = await fetchJsonDeduped(url, signal)
  if (!data.verses || !data.verses.length) {
    throw new ApiError('invalid', 'Invalid QCF response')
  }
  return {
    qcfVerses: data.verses.map(v =>
      (v.words || [])
        .filter(w => w.code_v2 && w.v2_page)
        .map(w => ({ code: w.code_v2, page: w.v2_page, isEnd: w.char_type_name === 'end' }))
    )
  }
}

// Per-verse tafsir (commentary) HTML from quran.com for a given tafsir source.
export async function fetchTafsir(tafsirId, surahNumber, ayahNumber, signal) {
  const url = `${QURANCOM_API}/tafsirs/${tafsirId}/by_ayah/${surahNumber}:${ayahNumber}`
  const data = await fetchJsonDeduped(url, signal)
  if (!data.tafsir || typeof data.tafsir.text !== 'string') {
    throw new ApiError('invalid', 'Invalid tafsir response')
  }
  return { text: data.tafsir.text }
}

// In-memory cache for footnote bodies (stable content, revisited often while reading).
const footnoteCache = new Map()

// Lazy-load a single translation footnote by Quran.com foot_note id.
export async function fetchFootnote(footnoteId, signal) {
  const key = Number(footnoteId)
  if (footnoteCache.has(key)) {
    return { id: key, text: footnoteCache.get(key) }
  }
  const url = `${QURANCOM_API}/foot_notes/${footnoteId}`
  const data = await fetchJsonDeduped(url, signal)
  if (!data.foot_note || typeof data.foot_note.text !== 'string') {
    throw new ApiError('invalid', 'Invalid footnote response')
  }
  const id = data.foot_note.id ?? key
  footnoteCache.set(key, data.foot_note.text)
  return { id, text: data.foot_note.text }
}

export async function fetchSurahTextQuranCom(surahNumber, translationId, signal) {
  const url = `${QURANCOM_API}/verses/by_chapter/${surahNumber}?translations=${translationId}&fields=text_uthmani&per_page=300`
  const data = await fetchJsonDeduped(url, signal)

  if (!data.verses || !data.verses.length) {
    throw new ApiError('invalid', 'Invalid Quran.com API response')
  }

  const stripBismillah = surahNumber !== 1 && surahNumber !== 9

  return {
    // Canonical code points preserved; display substitution happens at render time.
    verses: data.verses.map(v => {
      let text = v.text_uthmani
      if (stripBismillah && v.verse_number === 1) {
        text = stripBismillahFromVerse(text)
      }
      return { number: v.verse_number, text }
    }),
    translationVerses: data.verses.map(v => {
      const parsed = parseTranslationText(v.translations?.[0]?.text || '')
      return {
        number: v.verse_number,
        text: parsed.text,
        segments: parsed.segments,
        footnotes: parsed.footnotes
      }
    })
  }
}
