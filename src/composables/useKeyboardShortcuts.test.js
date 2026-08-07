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

function key(code, target) {
  const e = new KeyboardEvent('keydown', {
    code,
    key: code === 'Space' ? ' ' : code,
    bubbles: true,
    cancelable: true
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
})
