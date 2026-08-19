import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { i18n } from '../i18n/index.js'
import ProgressBar from './ProgressBar.vue'

function mountBar(props = {}) {
  return mount(ProgressBar, {
    props: { progress: 50, durationMs: 60000, currentTimeMs: 30000, ...props },
    global: { plugins: [i18n] }
  })
}

// The app sets dir="rtl" on the document root for Arabic/Urdu UI; simulate that
// with an ancestor wrapper carrying the dir attribute.
function mountBarRtl(props = {}) {
  const Host = defineComponent({
    components: { ProgressBar },
    inheritAttrs: false,
    template: '<div dir="rtl"><ProgressBar v-bind="$attrs" /></div>'
  })
  const host = mount(Host, {
    attrs: { progress: 50, durationMs: 60000, currentTimeMs: 30000, ...props },
    global: { plugins: [i18n] }
  })
  return host.findComponent(ProgressBar)
}

function mockRect(slider, { left = 0, width = 100 } = {}) {
  slider.element.getBoundingClientRect = () => ({
    left,
    width,
    right: left + width,
    top: 0,
    bottom: 16,
    height: 16
  })
}

describe('ProgressBar keyboard seeking', () => {
  it('steps forward on ArrowRight and back on ArrowLeft', async () => {
    const wrapper = mountBar()
    const slider = wrapper.find('[role="slider"]')

    await slider.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('seek')[0][0]).toBeCloseTo(0.52)

    await slider.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('seek')[1][0]).toBeCloseTo(0.48)
  })

  it('jumps to the start on Home and to the end on End', async () => {
    const wrapper = mountBar()
    const slider = wrapper.find('[role="slider"]')

    await slider.trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('seek')[0][0]).toBe(0)

    await slider.trigger('keydown', { key: 'End' })
    expect(wrapper.emitted('seek')[1][0]).toBe(1)
  })

  it('does not emit seek for unrelated keys', async () => {
    const wrapper = mountBar()
    const slider = wrapper.find('[role="slider"]')

    await slider.trigger('keydown', { key: 'Enter' })
    await slider.trigger('keydown', { key: 'a' })
    expect(wrapper.emitted('seek')).toBeUndefined()
  })
})

describe('ProgressBar pointer seeking', () => {
  it('maps a click to the elapsed side in LTR', async () => {
    const wrapper = mountBar()
    const slider = wrapper.find('[role="slider"]')
    mockRect(slider)

    await slider.trigger('pointerdown', { clientX: 25, pointerId: 1 })
    await slider.trigger('pointerup', { clientX: 25, pointerId: 1 })
    expect(wrapper.emitted('seek')[0][0]).toBeCloseTo(0.25)
  })

  it('mirrors the click ratio in RTL so the elapsed side starts at the right', async () => {
    const wrapper = mountBarRtl()
    const slider = wrapper.find('[role="slider"]')
    mockRect(slider)

    // 25px from the left edge is 75% of the way through an RTL track.
    await slider.trigger('pointerdown', { clientX: 25, pointerId: 1 })
    await slider.trigger('pointerup', { clientX: 25, pointerId: 1 })
    expect(wrapper.emitted('seek')[0][0]).toBeCloseTo(0.75)
  })
})

describe('ProgressBar RTL keyboard seeking', () => {
  it('inverts horizontal arrows like a native range input', async () => {
    const wrapper = mountBarRtl()
    const slider = wrapper.find('[role="slider"]')

    await slider.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('seek')[0][0]).toBeCloseTo(0.48)

    await slider.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('seek')[1][0]).toBeCloseTo(0.52)
  })

  it('keeps ArrowUp/ArrowDown and Home/End directions unchanged', async () => {
    const wrapper = mountBarRtl()
    const slider = wrapper.find('[role="slider"]')

    await slider.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.emitted('seek')[0][0]).toBeCloseTo(0.52)

    await slider.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('seek')[1][0]).toBeCloseTo(0.48)

    await slider.trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('seek')[2][0]).toBe(0)

    await slider.trigger('keydown', { key: 'End' })
    expect(wrapper.emitted('seek')[3][0]).toBe(1)
  })
})
