/* eslint-disable vue/one-component-per-file -- test harness components */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useFocusTrap } from './useFocusTrap.js'

function mountTrap(options = {}) {
  const onEscape = options.onEscape || vi.fn()
  const prefix = options.prefix || ''
  const Comp = defineComponent({
    setup() {
      const containerRef = ref(null)
      useFocusTrap(containerRef, { onEscape, autoFocus: options.autoFocus !== false })
      return { containerRef, onEscape }
    },
    template: `
      <div ref="containerRef" tabindex="-1">
        <button id="${prefix}first">First</button>
        <button id="${prefix}second">Second</button>
        <button id="${prefix}last">Last</button>
      </div>
    `
  })
  return mount(Comp, { attachTo: document.body })
}

// Dialog-style usage: the container only exists while `open` is true, so the
// trap must activate/deactivate with the element instead of the component.
function mountToggleTrap(options = {}) {
  const onEscape = options.onEscape || vi.fn()
  const Comp = defineComponent({
    setup() {
      const containerRef = ref(null)
      const open = ref(false)
      useFocusTrap(containerRef, { onEscape })
      return { containerRef, open, onEscape }
    },
    template: `
      <div>
        <button id="trigger" @click="open = true">Open</button>
        <div v-if="open" ref="containerRef" tabindex="-1">
          <button id="inner-first">Inner first</button>
          <button id="inner-last">Inner last</button>
        </div>
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

  it('activates only when the container appears and restores focus when it goes away', async () => {
    wrapper = mountToggleTrap()
    await nextTick()
    await nextTick()

    const trigger = document.getElementById('trigger')
    trigger.focus()
    expect(document.activeElement?.id).toBe('trigger')

    // Closed: Tab must not be hijacked.
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    document.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(false)

    wrapper.vm.open = true
    await nextTick()
    await nextTick()
    expect(document.activeElement?.id).toBe('inner-first')

    document.getElementById('inner-last').focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    )
    expect(document.activeElement?.id).toBe('inner-first')

    wrapper.vm.open = false
    await nextTick()
    await nextTick()
    expect(document.activeElement?.id).toBe('trigger')
  })

  it('lets the innermost trap win when dialogs nest', async () => {
    const outerEscape = vi.fn()
    const innerEscape = vi.fn()
    wrapper = mountTrap({ onEscape: outerEscape })
    await nextTick()
    await nextTick()

    const inner = mountTrap({ onEscape: innerEscape, prefix: 'inner-' })
    await nextTick()
    await nextTick()
    expect(document.activeElement?.id).toBe('inner-first')

    // Escape only reaches the topmost (inner) trap.
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    )
    expect(innerEscape).toHaveBeenCalledTimes(1)
    expect(outerEscape).not.toHaveBeenCalled()

    // Tab cycles within the inner dialog, not back into the outer one.
    document.getElementById('inner-last').focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    )
    expect(document.activeElement?.id).toBe('inner-first')

    // Once the inner dialog closes, the outer trap takes over again.
    inner.unmount()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    )
    expect(outerEscape).toHaveBeenCalledTimes(1)
    expect(innerEscape).toHaveBeenCalledTimes(1)
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
