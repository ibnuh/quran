import SURAHS from '../data/surahs.js'
import { normalizeArabicForSearch } from './arabicText.js'

// After normalizeArabicForSearch folding, a reference is two numbers separated
// by a colon (optionally spaced) or by whitespace, e.g. "2:255" or "2 255".
const REFERENCE_RE = /^(\d{1,3}) ?(?:: ?| )(\d{1,3})$/

// Parse an ayah reference query like "2:255", "٢:٢٥٥", or "2 255" into
// { surah, ayah }. Arabic-Indic digit folding and whitespace collapsing come
// from normalizeArabicForSearch, so anything the search box accepts for surah
// numbers also works here. Returns null unless the reference points at a real
// ayah, so callers only offer jumps that the /surah/ayah deep link can honor.
export function parseAyahReference(query) {
  const m = REFERENCE_RE.exec(normalizeArabicForSearch(query))
  if (!m) {
    return null
  }
  const surah = Number(m[1])
  const ayah = Number(m[2])
  const info = SURAHS[surah - 1]
  if (!info || ayah < 1 || ayah > info.numberOfAyahs) {
    return null
  }
  return { surah, ayah }
}
