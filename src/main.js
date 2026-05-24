import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import { i18n, setUiLocale, detectUiLocale } from './i18n/index.js'
import './assets/styles/main.css'

// Note: the saved theme (data-theme + theme-color meta) and animations setting are
// applied before first paint by a blocking inline script in index.html, so the
// OS/PWA status bar never snapshots the default green. The store re-applies on load.

// Apply the saved or detected UI language (and RTL direction) before mount.
try {
  const saved = JSON.parse(localStorage.getItem('quran-player-prefs') || '{}')
  setUiLocale(saved.uiLanguage || detectUiLocale())
} catch {
  setUiLocale('en')
}

// Capture PWA install prompt globally (fires before components mount)
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  window.__pwaInstallPrompt = e
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')

// PWA update prompt
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { updateSW } }))
  },
  onRegisteredSW(_, registration) {
    if (registration) {
      setInterval(() => registration.update(), 30 * 60 * 1000)
    }
  }
})
