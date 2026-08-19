import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '../i18n/index.js'
import ProgressBar from './ProgressBar.vue'

function mountBar(props = {}) {
  return mount(ProgressBar, {
    props: { progress: 50, durationMs: 60000, currentTimeMs: 30000, ...props },
    global: { plugins: [i18n] }
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
