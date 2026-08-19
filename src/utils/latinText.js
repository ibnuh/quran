// Fold romanized surah names so Indonesian and English spellings match.
// The catalog uses Al-Quran Cloud doubled vowels (Al-Waaqia, Ar-Room, Yaseen);
// speakers type the short form they say (waq, rum, yasin).

const COMBINING_MARKS_RE = /[\u0300-\u036f]/g
const APOSTROPHE_RE = /[''`\u02be\u02bf\u2018\u2019]/g
const NON_ALNUM_RE = /[^a-z0-9]+/g

export function normalizeLatinForSearch(text) {
  if (!text) {
    return ''
  }
  return String(text)
    .normalize('NFKD')
    .replace(COMBINING_MARKS_RE, '')
    .toLowerCase()
    .replace(APOSTROPHE_RE, '')
    .replace(NON_ALNUM_RE, '')
    .replace(/sy/g, 'sh')
    .replace(/dz/g, 'dh')
    .replace(/ts/g, 'th')
    .replace(/au/g, 'aw')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/ii/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/uu/g, 'u')
    .replace(/ah$/, 'a')
}

export function matchesLatinSearch(text, query) {
  if (!text || !query || !String(query).trim()) {
    return false
  }
  const hay = normalizeLatinForSearch(text)
  return String(query)
    .trim()
    .split(/\s+/)
    .every(term => {
      const folded = normalizeLatinForSearch(term)
      return folded.length > 0 && hay.includes(folded)
    })
}
