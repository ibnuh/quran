import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '../i18n/index.js'
import { usePlayerStore } from '../stores/player.js'
import { copyText } from '../utils/clipboard.js'
import VerseActions from './VerseActions.vue'

vi.mock('../utils/clipboard.js', () => ({ copyText: vi.fn() }))

function mountActions() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = usePlayerStore()
  store.currentSurahNum = 1
  store.currentVerseIndex = 0
  store.verses = [{ number: 1, text: 'آية' }]
  store.translationVerses = [{ number: 1, text: 'Translation one' }]
  const wrapper = mount(VerseActions, { global: { plugins: [pinia, i18n] } })
  return { wrapper, store }
}

function shareButton(wrapper) {
  return wrapper.findAll('button').find(b => {
    const label = b.attributes('aria-label')
    return label === 'Share this verse' || label === 'Link copied'
  })
}

describe('VerseActions share fallback feedback', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="sr-announcements"></div>'
    delete navigator.share
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    delete navigator.share
  })

  it('shows Link copied feedback when navigator.share is missing and copy succeeds', async () => {
    copyText.mockResolvedValue(true)
    const { wrapper } = mountActions()
    const btn = shareButton(wrapper)

    await btn.trigger('click')
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()

    expect(copyText).toHaveBeenCalledTimes(1)
    expect(copyText.mock.calls[0][0]).toContain('/1/1')
    expect(btn.attributes('aria-label')).toBe('Link copied')
    expect(btn.attributes('title')).toBe('Link copied')
    expect(btn.classes()).toContain('is-copied')
    expect(document.getElementById('sr-announcements').textContent).toBe('Link copied')
  })

  it('reverts to the share label after the feedback window', async () => {
    copyText.mockResolvedValue(true)
    const { wrapper } = mountActions()
    const btn = shareButton(wrapper)

    await btn.trigger('click')
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
    expect(btn.attributes('aria-label')).toBe('Link copied')

    await vi.advanceTimersByTimeAsync(1500)
    await nextTick()
    expect(btn.attributes('aria-label')).toBe('Share this verse')
    expect(btn.classes()).not.toContain('is-copied')
  })

  it('shows no feedback when the fallback copy fails', async () => {
    copyText.mockResolvedValue(false)
    const { wrapper } = mountActions()
    const btn = shareButton(wrapper)

    await btn.trigger('click')
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()

    expect(btn.attributes('aria-label')).toBe('Share this verse')
    expect(btn.classes()).not.toContain('is-copied')
    expect(document.getElementById('sr-announcements').textContent).toBe('')
  })

  it('uses the native share sheet without copy feedback when available', async () => {
    const share = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true })
    copyText.mockResolvedValue(true)
    const { wrapper } = mountActions()
    const btn = shareButton(wrapper)

    await btn.trigger('click')
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()

    expect(share).toHaveBeenCalledTimes(1)
    expect(share.mock.calls[0][0].url).toContain('/1/1')
    expect(copyText).not.toHaveBeenCalled()
    expect(btn.attributes('aria-label')).toBe('Share this verse')
  })
})
