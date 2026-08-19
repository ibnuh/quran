// Sanitize third-party tafsir HTML (quran.com) before rendering via v-html.
// Defense in depth: the source is trusted, but never render raw markup.
// isomorphic-dompurify uses the real window in browsers and jsdom under Node/vitest
// (happy-dom is incomplete for DOMPurify's temporary DOM).
import DOMPurify from 'isomorphic-dompurify'

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'b',
    'strong',
    'i',
    'em',
    'u',
    's',
    'span',
    'div',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'hr',
    'a',
    'sup',
    'sub'
  ],
  ALLOWED_ATTR: ['href', 'title', 'class', 'lang', 'dir', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i
}

let hooksInstalled = false

function ensurePurifyHooks() {
  if (hooksInstalled) {
    return
  }
  hooksInstalled = true
  DOMPurify.addHook('afterSanitizeAttributes', node => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href')
      if (href && !/^(https?:|mailto:|#)/i.test(href)) {
        node.removeAttribute('href')
      }
      if (node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer')
      }
    }
  })
}

export function sanitizeHtml(html) {
  if (!html) {
    return ''
  }
  ensurePurifyHooks()
  return DOMPurify.sanitize(String(html), PURIFY_CONFIG)
}

const ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' '
}

// Decode a numeric character reference. fromCodePoint (not fromCharCode) so
// astral characters do not get truncated to lone surrogates; invalid code
// points keep the original entity text.
function decodeCodePoint(entity, codePoint) {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return entity
  }
  return String.fromCodePoint(codePoint)
}

// Footnote API bodies are usually plain text but occasionally include light HTML
// (<i>, <br>, entities). Convert to readable plain text for the sheet.
export function htmlToPlainText(html) {
  if (!html) {
    return ''
  }
  return String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#39;/g, m => ENTITY_MAP[m] || m)
    .replace(/&#(\d+);/g, (m, n) => decodeCodePoint(m, Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => decodeCodePoint(m, parseInt(h, 16)))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
