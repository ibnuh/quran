// Minimal HTML sanitizer for rendering third-party tafsir content via v-html.
// Strips scripts/styles/iframes, inline event handlers, and javascript: URLs.
// Defense in depth: the source (quran.com) is trusted, but never render raw.
export function sanitizeHtml(html) {
  if (!html) {
    return ''
  }
  return String(html)
    .replace(/<\s*(script|style|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'")
}
