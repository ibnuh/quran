import { createI18n } from 'vue-i18n'
import en from './locales/en.js'
import ar from './locales/ar.js'
import ur from './locales/ur.js'

// Supported UI locales. dir drives layout mirroring for right-to-left languages.
export const UI_LOCALES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'ur', name: 'اردو', dir: 'rtl' }
]

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ar, ur },
  missingWarn: false,
  fallbackWarn: false
})

// Translate from non-component code (store, composables).
export function t(key, params) {
  return i18n.global.t(key, params || {})
}

// Apply a UI locale: switch messages and set the document lang/dir for RTL mirroring.
export function setUiLocale(code) {
  const loc = UI_LOCALES.find(l => l.code === code) || UI_LOCALES[0]
  i18n.global.locale.value = loc.code
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', loc.code)
    document.documentElement.setAttribute('dir', loc.dir)
  }
  return loc.code
}

// Pick an initial UI locale from the browser languages.
export function detectUiLocale() {
  const langs = (typeof navigator !== 'undefined' &&
    (navigator.languages || [navigator.language])) || ['en']
  for (const l of langs) {
    const code = (l || '').split('-')[0].toLowerCase()
    if (UI_LOCALES.some(x => x.code === code)) {
      return code
    }
  }
  return 'en'
}
