const API_BASE = 'https://api.alquran.cloud/v1'

export async function fetchSurahEditions(surahNumber, translationId, reciterId) {
  const url = `${API_BASE}/surah/${surahNumber}/editions/quran-uthmani,${translationId},${reciterId}`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  const data = await res.json()

  if (data.code !== 200 || !data.data || data.data.length < 3) {
    throw new Error('Invalid API response')
  }

  const [arabicData, translationData, audioData] = data.data

  return {
    verses: arabicData.ayahs.map(a => ({
      number: a.numberInSurah,
      text: a.text
    })),
    translationVerses: translationData.ayahs.map(a => ({
      number: a.numberInSurah,
      text: a.text
    })),
    audioUrls: audioData.ayahs.map(a => a.audio)
  }
}
