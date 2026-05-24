import { watch } from 'vue'

const ORIGIN = 'https://quran.ibnuhx.com'

function setMeta(selector, attr, value) {
  const el = document.querySelector(selector)
  if (el) {
    el.setAttribute(attr, value)
  }
}

// Keep the document title and sharing metadata (description, canonical, Open Graph,
// Twitter) in sync with the current surah/verse so deep links share meaningfully.
export function useSeo(store) {
  function update() {
    const surah = store.currentSurah
    const verse = store.currentVerse
    let title = 'Quran Player'
    let description =
      'Read and listen to the Quran with synchronized word-by-word highlighting.'
    let url = ORIGIN + '/'

    if (surah) {
      const ref = verse ? `${surah.englishName} ${verse.number}` : surah.englishName
      title = `${ref} - Quran Player`
      description = `Read and listen to Surah ${surah.englishName} (${surah.englishNameTranslation}) with translation and word-by-word recitation.`
      url = `${ORIGIN}/${store.currentSurahNum}${verse ? '/' + verse.number : ''}`
    }

    document.title = title
    setMeta('meta[name="description"]', 'content', description)
    setMeta('link[rel="canonical"]', 'href', url)
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[property="og:url"]', 'content', url)
    setMeta('meta[name="twitter:title"]', 'content', title)
    setMeta('meta[name="twitter:description"]', 'content', description)
  }

  watch(() => [store.currentSurahNum, store.currentVerse], update)

  return { update }
}
