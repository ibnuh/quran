// Parse Quran.com translation HTML into plain text + structured footnote segments.
// Markers look like: <sup foot_note=195935>1</sup> or <sup foot_note="177007">1</sup>
// Other tags (e.g. <i class="s"> on Bridges) are stripped to plain text.

const FOOTNOTE_SUP_RE =
  /<sup\b[^>]*\bfoot_note\s*=\s*["']?(\d+)["']?[^>]*>([\s\S]*?)<\/sup>/gi

const ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' '
}

function decodeEntities(str) {
  if (!str) {
    return ''
  }
  return String(str)
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#39;/g, m => ENTITY_MAP[m] || m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

function stripTags(html) {
  return decodeEntities(String(html || '').replace(/<[^>]*>/g, ''))
}

/**
 * @param {string} html Raw translation HTML from Quran.com (or plain text).
 * @returns {{ text: string, segments: Array<{type:'text'|'footnote', value?: string, id?: number, label?: string}>, footnotes: Array<{id: number, label: string}> }}
 */
export function parseTranslationText(html) {
  const raw = String(html || '')
  if (!raw) {
    return { text: '', segments: [], footnotes: [] }
  }

  // Fast path: no HTML-ish content at all.
  if (!raw.includes('<')) {
    const text = decodeEntities(raw)
    return {
      text,
      segments: text ? [{ type: 'text', value: text }] : [],
      footnotes: []
    }
  }

  const segments = []
  const footnotes = []
  let lastIndex = 0
  let match

  FOOTNOTE_SUP_RE.lastIndex = 0
  while ((match = FOOTNOTE_SUP_RE.exec(raw)) !== null) {
    const before = raw.slice(lastIndex, match.index)
    const plainBefore = stripTags(before)
    if (plainBefore) {
      segments.push({ type: 'text', value: plainBefore })
    }

    const id = Number(match[1])
    const label = stripTags(match[2]).trim() || String(footnotes.length + 1)
    if (Number.isFinite(id)) {
      segments.push({ type: 'footnote', id, label })
      footnotes.push({ id, label })
    }

    lastIndex = match.index + match[0].length
  }

  const after = raw.slice(lastIndex)
  const plainAfter = stripTags(after)
  if (plainAfter) {
    segments.push({ type: 'text', value: plainAfter })
  }

  // If the regex found nothing but tags remain (e.g. only <i> wrappers), strip them.
  if (!segments.length) {
    const text = stripTags(raw)
    return {
      text,
      segments: text ? [{ type: 'text', value: text }] : [],
      footnotes: []
    }
  }

  const text = segments.map(s => (s.type === 'text' ? s.value : '')).join('')

  return { text, segments, footnotes }
}

// Cloud edition identifiers that have a same-family Quran.com resource with footnotes.
export const CLOUD_TO_QURANCOM = {
  'en.sahih': 20,
  'en.hilali': 203
}

/**
 * Resolve which API to use for a catalog translation identifier.
 * @param {string} identifier e.g. 'en.sahih', 'en.itani', 'qdc.84'
 * @returns {{ kind: 'cloud' | 'qurancom', editionId: string | number }}
 */
export function resolveTranslationSource(identifier) {
  const id = String(identifier || '')
  if (id.startsWith('qdc.')) {
    const num = parseInt(id.slice(4), 10)
    if (Number.isFinite(num)) {
      return { kind: 'qurancom', editionId: num }
    }
  }
  if (Object.prototype.hasOwnProperty.call(CLOUD_TO_QURANCOM, id)) {
    return { kind: 'qurancom', editionId: CLOUD_TO_QURANCOM[id] }
  }
  return { kind: 'cloud', editionId: id }
}
