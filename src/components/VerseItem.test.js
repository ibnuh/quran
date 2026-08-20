import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import VerseItem from './VerseItem.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function mountItem() {
  return mount(VerseItem, {
    props: {
      verse: { number: 1, text: 'بِسْمِ اللَّهِ' },
      translation: { text: 'خدا کے نام سے' },
      isActive: false
    }
  })
}

describe('VerseItem translation direction', () => {
  it('lets the browser resolve direction from the translation content', () => {
    const wrapper = mountItem()
    const translation = wrapper.findAll('p').at(1)
    expect(translation.attributes('dir')).toBe('auto')
    expect(translation.classes()).toContain('text-start')
  })

  it('keeps the Arabic verse text explicitly RTL', () => {
    const wrapper = mountItem()
    const arabic = wrapper.findAll('p').at(0)
    expect(arabic.attributes('dir')).toBe('rtl')
    expect(arabic.attributes('lang')).toBe('ar')
  })
})
