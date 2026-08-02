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
  it('strips script tags', () => {
    expect(sanitizeHtml('Hello <script>alert(1)</script>world')).toBe('Hello world')
  })
})
