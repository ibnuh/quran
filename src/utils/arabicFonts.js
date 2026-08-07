// Inject Google Fonts stylesheets for non-default Arabic faces on demand.
// Defaults (Amiri Quran + Amiri) ship in index.html; Uthmanic uses a local @font-face.

const GOOGLE_ARABIC_FONT_QUERIES = {
  scheherazade: 'family=Scheherazade+New:wght@400;700',
  noto: 'family=Noto+Naskh+Arabic:wght@400;700',
  lateef: 'family=Lateef:wght@400;700',
  'reem-kufi': 'family=Reem+Kufi:wght@400;700'
}

// Already present in index.html (or custom @font-face); no stylesheet inject needed.
const BUNDLED_FONT_IDS = new Set(['amiri-quran', 'amiri', 'uthmanic'])

const injected = new Set()

/**
 * Ensure the CSS for a selectable Arabic font is available.
 * Safe to call repeatedly; no-ops for defaults and already-injected faces.
 * @param {string} fontId
 */
export function ensureArabicFontStylesheet(fontId) {
  if (typeof document === 'undefined' || !fontId) {
    return
  }
  if (BUNDLED_FONT_IDS.has(fontId) || injected.has(fontId)) {
    return
  }
  const query = GOOGLE_ARABIC_FONT_QUERIES[fontId]
  if (!query) {
    return
  }
  injected.add(fontId)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?${query}&display=swap`
  link.dataset.arabicFont = fontId
  document.head.appendChild(link)
}
