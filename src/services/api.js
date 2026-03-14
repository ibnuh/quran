const TEXT_API = 'https://api.alquran.cloud/v1'
const AUDIO_API = 'https://api.qurancdn.com/api/qdc/audio/reciters'

export async function fetchSurahText(surahNumber, translationId) {
  const url = `${TEXT_API}/surah/${surahNumber}/editions/quran-uthmani,${translationId}`
  const res = await fetch(url)

  if (!res.ok) throw new Error(`Text API error: ${res.status}`)

  const data = await res.json()

  if (data.code !== 200 || !data.data || data.data.length < 2) {
    throw new Error('Invalid text API response')
  }

  const [arabicData, translationData] = data.data

  return {
    verses: arabicData.ayahs.map(a => ({
      number: a.numberInSurah,
      text: a.text
    })),
    translationVerses: translationData.ayahs.map(a => ({
      number: a.numberInSurah,
      text: a.text
    }))
  }
}

export async function fetchSurahAudio(reciterId, chapterNumber) {
  const url = `${AUDIO_API}/${reciterId}/audio_files?chapter=${chapterNumber}&segments=true`
  const res = await fetch(url)

  if (!res.ok) throw new Error(`Audio API error: ${res.status}`)

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
      timestampTo: vt.timestamp_to
    }))
  }
}
