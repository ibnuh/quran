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
