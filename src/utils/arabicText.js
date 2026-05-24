// Display-only Arabic rendering helpers. The canonical verse text in the store keeps
// the original Uthmani code points (for copy, share, and search); these transforms are
// applied only when rendering glyphs.

// Some bundled fonts mis-shape the word-final alef maqsura (U+0649), so render it as a
// farsi yeh (U+06CC) which shapes correctly. Scoped to display so it never leaks into
// copied or searched text.
export function toDisplayArabic(text) {
  if (!text) {
    return ''
  }
  return text.replace(/ى/g, 'ی')
}

// Render a number in Arabic-Indic digits (e.g. 45 -> ٤٥) for the end-of-ayah ornament.
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
export function toArabicDigits(value) {
  return String(value).replace(/\d/g, d => ARABIC_DIGITS[Number(d)])
}

// Tajweed rule colors (mid-tones chosen to read on both light and dark themes).
export const TAJWEED_COLORS = {
  ghunnah: '#e07b39',
  qalqalah: '#e0484f',
  ikhafa: '#b15fd6',
  ikhafa_shafawi: '#b15fd6',
  idgham_ghunna: '#3fa34d',
  idgham_shafawi: '#3fa34d',
  idgham_wo_ghunna: '#8a9099',
  idgham_mutajanisayn: '#8a9099',
  idgham_mutaqaribayn: '#8a9099',
  iqlab: '#3aa6d6',
  madda_normal: '#5b8def',
  madda_permissible: '#5b8def',
  madda_necessary: '#4a6fe0',
  madda_obligatory_monfasel: '#4a6fe0',
  madda_obligatory_mottasel: '#4a6fe0',
  ham_wasl: '#9aa0a6',
  laam_shamsiyah: '#9aa0a6',
  slnt: '#9aa0a6'
}

export function tajweedColor(rule) {
  return TAJWEED_COLORS[rule] || 'inherit'
}

// Representative rules shown in the settings legend.
export const TAJWEED_RULES = [
  { key: 'ghunnah', label: 'Ghunnah' },
  { key: 'qalqalah', label: 'Qalqalah' },
  { key: 'ikhafa', label: 'Ikhafa' },
  { key: 'idgham_ghunna', label: 'Idgham' },
  { key: 'iqlab', label: 'Iqlab' },
  { key: 'madda_normal', label: 'Madd' },
  { key: 'ham_wasl', label: 'Silent / wasl' }
]

// Parse quran.com tajweed HTML into ordered { text, rule } segments so it can be
// rendered with per-rule colored spans without v-html (XSS-safe). The end-of-ayah
// marker (<span class=end>..</span>) is dropped; the app shows its own number.
export function parseTajweed(raw) {
  if (!raw) {
    return []
  }
  const cleaned = raw.replace(/<span class=end>[\s\S]*?<\/span>/g, '')
  const segments = []
  const re = /<tajweed class=([a-z_]+)>([\s\S]*?)<\/tajweed>/g
  let last = 0
  let m
  while ((m = re.exec(cleaned)) !== null) {
    if (m.index > last) {
      segments.push({ text: cleaned.slice(last, m.index), rule: null })
    }
    segments.push({ text: m[2], rule: m[1] })
    last = re.lastIndex
  }
  if (last < cleaned.length) {
    segments.push({ text: cleaned.slice(last), rule: null })
  }
  // Strip any stray markup defensively; segment text should be plain Arabic.
  return segments
    .map(s => ({ text: s.text.replace(/<[^>]*>/g, ''), rule: s.rule }))
    .filter(s => s.text.length > 0)
}

// True when a whitespace-delimited token is purely Quranic waqf (pause) / small high
// marks (U+06D6..U+06ED). These must be displayed but are not separately highlightable
// words, so they get attached to the preceding word.
export function isWaqfToken(token) {
  return /^[ۖ-ۭ]+$/.test(token)
}

// Split a verse into highlightable word tokens, attaching standalone waqf marks to the
// preceding word so the rendered glyph sequence matches the full verse string. Each
// returned entry's array index equals its word index (aligned with verse timing
// segments, which count real words only).
export function toVerseTokens(text) {
  const raw = toDisplayArabic(text).split(/\s+/).filter(Boolean)
  const tokens = []
  let lead = ''
  for (const t of raw) {
    if (isWaqfToken(t)) {
      if (tokens.length > 0) {
        tokens[tokens.length - 1].display += ' ' + t
      } else {
        lead += t + ' '
      }
    } else {
      tokens.push({ display: lead + t })
      lead = ''
    }
  }
  return tokens
}
