// QCF v2 (quran.com Madani mushaf) per-page glyph fonts. Each Quran page has its own
// woff2 where word glyphs are addressed by code points (the `code_v2` field). We inject
// an @font-face per page on demand and render each word in its page's font.
const QCF_BASE = 'https://static.qurancdn.com/fonts/quran/hafs/v2/woff2'
const injected = new Set()

export function qcfFontFamily(page) {
  return `qcf2-p${page}`
}

export function ensureQcfPageFont(page) {
  if (typeof document === 'undefined' || !page || injected.has(page)) {
    return
  }
  injected.add(page)
  const style = document.createElement('style')
  style.dataset.qcfPage = String(page)
  style.textContent = `@font-face{font-family:'${qcfFontFamily(page)}';src:url('${QCF_BASE}/p${page}.woff2') format('woff2');font-display:swap}`
  document.head.appendChild(style)
}
