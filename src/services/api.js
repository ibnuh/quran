const TEXT_API = 'https://api.alquran.cloud/v1'
const AUDIO_API = 'https://api.qurancdn.com/api/qdc/audio/reciters'

const MAX_RETRIES = 2
const RETRY_DELAY = 1000

async function fetchWithRetry(url, retries = MAX_RETRIES, signal) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, signal ? { signal } : undefined)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res
    } catch (err) {
      if (err.name === 'AbortError') throw err
      if (attempt === retries) throw err
      await new Promise(r => setTimeout(r, RETRY_DELAY * Math.pow(2, attempt)))
    }
  }
}

// LRU cache for loaded surahs (max 5 entries)
const surahCache = new Map()
const CACHE_MAX = 5

function getCacheKey(surahNum, translationId, reciterId) {
  return `${surahNum}:${translationId}:${reciterId}`
}

export function getCachedSurah(surahNum, translationId, reciterId) {
  return surahCache.get(getCacheKey(surahNum, translationId, reciterId)) || null
}

export function cacheSurah(surahNum, translationId, reciterId, data) {
  const key = getCacheKey(surahNum, translationId, reciterId)
  if (surahCache.has(key)) surahCache.delete(key)
  if (surahCache.size >= CACHE_MAX) {
    const oldest = surahCache.keys().next().value
    surahCache.delete(oldest)
  }
  surahCache.set(key, data)
}

export async function fetchSurahText(surahNumber, translationId, signal) {
  const url = `${TEXT_API}/surah/${surahNumber}/editions/quran-uthmani,${translationId}`
  const res = await fetchWithRetry(url, MAX_RETRIES, signal)

  const data = await res.json()

  if (data.code !== 200 || !data.data || data.data.length < 2) {
    throw new Error('Invalid text API response')
  }

  const [arabicData, translationData] = data.data
  const stripBismillah = surahNumber !== 1 && surahNumber !== 9

  return {
    verses: arabicData.ayahs.map(a => {
      let text = a.text.replace(/\u0649/g, '\u06CC')
      if (stripBismillah && a.numberInSurah === 1) {
        text = text.replace(/^\u0628\u0650\u0633\u0652\u0645\u0650 .+?\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650\s*/, '')
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
  const res = await fetchWithRetry(url, MAX_RETRIES, signal)

  const data = await res.json()

  if (!data.audio_files || !data.audio_files.length) {
    throw new Error('No audio data available')
  }

  const file = data.audio_files[0]

  return {
    audioUrl: file.audio_url,
    duration: file.duration,
    verseTimings: file.verse_timings.map(vt => ({
      verseKey: vt.verse_key,
      timestampFrom: vt.timestamp_from,
      timestampTo: vt.timestamp_to,
      segments: (vt.segments || []).map(s => ({
        wordIndex: s[0] - 1,
        from: s[1],
        to: s[2]
      }))
    }))
  }
}

export async function fetchVerseAudio(cloudReciterId, surahNumber, signal) {
  const url = `${TEXT_API}/surah/${surahNumber}/${cloudReciterId}`
  const res = await fetchWithRetry(url, MAX_RETRIES, signal)

  const data = await res.json()

  if (data.code !== 200 || !data.data) {
    throw new Error('Invalid verse audio response')
  }

  return {
    audioUrls: data.data.ayahs.map(a => a.audio)
  }
}
