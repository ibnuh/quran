import { describe, it, expect } from 'vitest'
import { sanitizeHtml, htmlToPlainText } from './html.js'

describe('htmlToPlainText', () => {
  it('returns empty string for empty input', () => {
    expect(htmlToPlainText('')).toBe('')
    expect(htmlToPlainText(null)).toBe('')
  })

  it('strips tags and decodes entities', () => {
    expect(htmlToPlainText('Allah is a <i>proper</i> name &amp; title.')).toBe(
      'Allah is a proper name & title.'
    )
  })

  it('turns br and p into newlines', () => {
    expect(htmlToPlainText('Line one<br>Line two</p><p>Line three')).toBe(
      'Line one\nLine two\nLine three'
    )
  })
})

describe('sanitizeHtml', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml(null)).toBe('')
  })

  it('strips script tags', () => {
    // Script element is removed; its text content may remain (DOMPurify default).
    const out = sanitizeHtml('Hello <script>alert(1)</script>world')
    expect(out).not.toMatch(/<script/i)
    expect(out).toContain('Hello')
    expect(out).toContain('world')
  })

  it('strips inline event handlers', () => {
    const out = sanitizeHtml('<p onclick="alert(1)">safe</p>')
    expect(out).not.toMatch(/onclick/i)
    expect(out).toContain('safe')
  })

  it('neutralizes javascript: URLs', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>')
    expect(out).not.toMatch(/javascript:/i)
  })

  it('strips iframe and object tags', () => {
    const out = sanitizeHtml('<iframe src="https://evil.test"></iframe><p>ok</p>')
    expect(out).not.toMatch(/iframe/i)
    expect(out).toContain('ok')
  })

  it('strips style tags', () => {
    const out = sanitizeHtml('<style>body{display:none}</style><p>text</p>')
    expect(out).not.toMatch(/<style/i)
    expect(out).toContain('text')
  })

  it('keeps safe formatting tags used by tafsir', () => {
    const out = sanitizeHtml('<p><strong>Title</strong> and <em lang="ar">كلمة</em></p>')
    expect(out).toContain('<strong>')
    expect(out).toContain('<em')
    expect(out).toContain('lang="ar"')
  })

  it('blocks data: URLs in href', () => {
    const out = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')
    expect(out).not.toMatch(/data:/i)
  })
})
