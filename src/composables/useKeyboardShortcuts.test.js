import { describe, it, expect, afterEach, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useKeyboardShortcuts } from './useKeyboardShortcuts.js'

function mountShortcuts(handlers) {
  const Comp = defineComponent({
    setup() {
      useKeyboardShortcuts(handlers)
      return {}
    },
    template: '<div />'
  })
  return mount(Comp, { attachTo: document.body })
}

function key(code, target, init = {}) {
  const e = new KeyboardEvent('keydown', {
    code,
    key: code === 'Space' ? ' ' : code,
    bubbles: true,
    cancelable: true,
    ...init
  })
  Object.defineProperty(e, 'target', { value: target })
  document.dispatchEvent(e)
  return e
}

describe('useKeyboardShortcuts', () => {
  let wrapper
  const togglePlay = vi.fn()
  const nextVerse = vi.fn()
  const prevVerse = vi.fn()
  const toggleHelp = vi.fn()

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('dir')
    vi.clearAllMocks()
  })

  it('toggles play on Space when focus is not on a control', async () => {
    wrapper = mountShortcuts({ togglePlay, nextVerse, prevVerse, toggleHelp })
    await nextTick()
    key('Space', document.body)
    expect(togglePlay).toHaveBeenCalledTimes(1)
  })

  it('ignores Space on button, textarea, link, and role=slider', async () => {
    wrapper = mountShortcuts({ togglePlay, nextVerse, prevVerse, toggleHelp })
    await nextTick()

    const button = document.createElement('button')
    document.body.appendChild(button)
    key('Space', button)

    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    key('Space', textarea)

    const anchor = document.createElement('a')
    anchor.href = '#'
    document.body.appendChild(anchor)
    key('Space', anchor)

    const slider = document.createElement('div')
    slider.setAttribute('role', 'slider')
    document.body.appendChild(slider)
    key('Space', slider)

    expect(togglePlay).not.toHaveBeenCalled()
  })

  it('ignores arrows when focus is inside a role=menu', async () => {
    wrapper = mountShortcuts({ togglePlay, nextVerse, prevVerse, toggleHelp })
    await nextTick()

    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    const item = document.createElement('div')
    item.setAttribute('role', 'menuitem')
    menu.appendChild(item)
    document.body.appendChild(menu)

    key('ArrowRight', item)
    key('ArrowLeft', item)
    expect(nextVerse).not.toHaveBeenCalled()
    expect(prevVerse).not.toHaveBeenCalled()
  })

  it('leaves browser/system combos alone (Alt, Ctrl, Meta modifiers)', async () => {
    wrapper = mountShortcuts({ togglePlay, nextVerse, prevVerse, toggleHelp })
    await nextTick()

    // Alt+Left/Right are browser back/forward; Ctrl/Meta combos belong to the OS.
    const altLeft = key('ArrowLeft', document.body, { altKey: true })
    const altRight = key('ArrowRight', document.body, { altKey: true })
    const ctrlSpace = key('Space', document.body, { ctrlKey: true })
    const metaRight = key('ArrowRight', document.body, { metaKey: true })

    expect(prevVerse).not.toHaveBeenCalled()
    expect(nextVerse).not.toHaveBeenCalled()
    expect(togglePlay).not.toHaveBeenCalled()
    expect(altLeft.defaultPrevented).toBe(false)
    expect(altRight.defaultPrevented).toBe(false)
    expect(ctrlSpace.defaultPrevented).toBe(false)
    expect(metaRight.defaultPrevented).toBe(false)
  })

  it('ignores keys when focus is in an editable region', async () => {
    wrapper = mountShortcuts({ togglePlay, nextVerse, prevVerse, toggleHelp })
    await nextTick()

    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    document.body.appendChild(editable)
    Object.defineProperty(editable, 'isContentEditable', { value: true })

    key('Space', editable)
    key('ArrowRight', editable)
    expect(togglePlay).not.toHaveBeenCalled()
    expect(nextVerse).not.toHaveBeenCalled()
  })

  it('does not toggle play repeatedly while Space is held down', async () => {
    wrapper = mountShortcuts({ togglePlay, nextVerse, prevVerse, toggleHelp })
    await nextTick()

    key('Space', document.body)
    key('Space', document.body, { repeat: true })
    key('Space', document.body, { repeat: true })
    expect(togglePlay).toHaveBeenCalledTimes(1)
  })

  it('still navigates on repeated arrow keys', async () => {
    wrapper = mountShortcuts({ togglePlay, nextVerse, prevVerse, toggleHelp })
    await nextTick()

    key('ArrowRight', document.body)
    key('ArrowRight', document.body, { repeat: true })
    expect(nextVerse).toHaveBeenCalledTimes(2)
  })

  it('maps ArrowRight to next and ArrowLeft to prev in LTR', async () => {
    wrapper = mountShortcuts({ togglePlay, nextVerse, prevVerse, toggleHelp })
    await nextTick()

    key('ArrowRight', document.body)
    key('ArrowLeft', document.body)
    expect(nextVerse).toHaveBeenCalledTimes(1)
    expect(prevVerse).toHaveBeenCalledTimes(1)
  })

  it('mirrors horizontal arrows in RTL layouts (Arabic/Urdu UI)', async () => {
    document.documentElement.setAttribute('dir', 'rtl')
    wrapper = mountShortcuts({ togglePlay, nextVerse, prevVerse, toggleHelp })
    await nextTick()

    // In RTL the next verse sits visually to the left, matching the mirrored controls.
    key('ArrowLeft', document.body)
    expect(nextVerse).toHaveBeenCalledTimes(1)
    expect(prevVerse).not.toHaveBeenCalled()

    key('ArrowRight', document.body)
    expect(prevVerse).toHaveBeenCalledTimes(1)
    expect(nextVerse).toHaveBeenCalledTimes(1)
  })

  it('follows a mid-session direction switch without remounting', async () => {
    wrapper = mountShortcuts({ togglePlay, nextVerse, prevVerse, toggleHelp })
    await nextTick()

    key('ArrowRight', document.body)
    expect(nextVerse).toHaveBeenCalledTimes(1)

    document.documentElement.setAttribute('dir', 'rtl')
    key('ArrowRight', document.body)
    expect(prevVerse).toHaveBeenCalledTimes(1)
    expect(nextVerse).toHaveBeenCalledTimes(1)
  })
})
