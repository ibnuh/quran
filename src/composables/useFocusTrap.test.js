import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useFocusTrap } from './useFocusTrap.js'

function mountTrap(options = {}) {
  const onEscape = options.onEscape || vi.fn()
  const Comp = defineComponent({
    setup() {
      const containerRef = ref(null)
      useFocusTrap(containerRef, { onEscape, autoFocus: options.autoFocus !== false })
      return { containerRef, onEscape }
    },
    template: `
      <div ref="containerRef" tabindex="-1">
        <button id="first">First</button>
        <button id="second">Second</button>
        <button id="last">Last</button>
      </div>
    `
  })
  return mount(Comp, { attachTo: document.body })
}

describe('useFocusTrap', () => {
  let wrapper

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    document.body.innerHTML = ''
  })

  it('focuses the first focusable control on mount', async () => {
    wrapper = mountTrap()
    await nextTick()
    await nextTick()
    expect(document.activeElement?.id).toBe('first')
  })

  it('cycles Tab from last back to first', async () => {
    wrapper = mountTrap()
    await nextTick()
    await nextTick()
    const last = document.getElementById('last')
    last.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    )
    expect(document.activeElement?.id).toBe('first')
  })

  it('cycles Shift+Tab from first back to last', async () => {
    wrapper = mountTrap()
    await nextTick()
    await nextTick()
    const first = document.getElementById('first')
    first.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })
    )
    expect(document.activeElement?.id).toBe('last')
  })

  it('invokes onEscape for Escape', async () => {
    const onEscape = vi.fn()
    wrapper = mountTrap({ onEscape })
    await nextTick()
    await nextTick()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    )
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('restores focus to the previous element on unmount', async () => {
    const outside = document.createElement('button')
    outside.id = 'outside'
    document.body.appendChild(outside)
    outside.focus()
    expect(document.activeElement?.id).toBe('outside')

    wrapper = mountTrap()
    await nextTick()
    await nextTick()
    expect(document.activeElement?.id).toBe('first')

    wrapper.unmount()
    wrapper = null
    expect(document.activeElement?.id).toBe('outside')
  })
})
