import { describe, it, expect, afterEach, vi } from 'vitest'
import { copyText } from './clipboard.js'

const originalClipboard = navigator.clipboard

function setClipboard(value) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

afterEach(() => {
  setClipboard(originalClipboard)
  document.execCommand = undefined
  document.body.innerHTML = ''
})

describe('copyText', () => {
  it('uses the async Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    await expect(copyText('bismillah')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('bismillah')
  })

  it('falls back to execCommand when the Clipboard API is missing', async () => {
    setClipboard(undefined)
    document.execCommand = vi.fn().mockReturnValue(true)

    await expect(copyText('fallback text')).resolves.toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    // The helper textarea must not linger in the document.
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('falls back to execCommand when writeText rejects', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    document.execCommand = vi.fn().mockReturnValue(true)

    await expect(copyText('retry text')).resolves.toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it('resolves false instead of throwing when nothing works', async () => {
    setClipboard(undefined)
    document.execCommand = undefined

    await expect(copyText('no clipboard')).resolves.toBe(false)
  })
})
