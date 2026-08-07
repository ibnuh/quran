// QCF v2 (quran.com Madani mushaf) per-page glyph fonts. Each Quran page has its own
// woff2 where word glyphs are addressed by code points (the `code_v2` field). We inject
// an @font-face per page on demand and render each word in its page's font.
const QCF_BASE = 'https://static.qurancdn.com/fonts/quran/hafs/v2/woff2'
const QCF_PAGE_MIN = 1
const QCF_PAGE_MAX = 604
const injected = new Set()

// Coerce and clamp a mushaf page number to the valid 1..604 range.
export function normalizeQcfPage(page) {
  const n = Number(page)
  if (!Number.isFinite(n)) {
    return null
  }
  const pageNum = Math.trunc(n)
  if (pageNum < QCF_PAGE_MIN || pageNum > QCF_PAGE_MAX) {
    return null
  }
  return pageNum
}

export function qcfFontFamily(page) {
  const pageNum = normalizeQcfPage(page)
  if (pageNum == null) {
    return 'qcf2-p1'
  }
  return `qcf2-p${pageNum}`
}

export function ensureQcfPageFont(page) {
  const pageNum = normalizeQcfPage(page)
  if (typeof document === 'undefined' || pageNum == null || injected.has(pageNum)) {
    return
  }
  injected.add(pageNum)
  const style = document.createElement('style')
  style.dataset.qcfPage = String(pageNum)
  style.textContent = `@font-face{font-family:'${qcfFontFamily(pageNum)}';src:url('${QCF_BASE}/p${pageNum}.woff2') format('woff2');font-display:swap}`
  document.head.appendChild(style)
}
