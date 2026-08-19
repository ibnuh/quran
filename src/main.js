import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
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

// PWA update prompt. registerType: 'prompt' + skipWaiting:false means a new worker
// stays waiting until the user accepts. Do NOT reload on controllerchange here:
// that caused silent auto-updates mid-session. Only UpdatePrompt / Settings reload
// after an explicit user action.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { updateSW } }))
  },
  onRegisteredSW(_, registration) {
    if (!registration) {
      return
    }
    // update() rejects while offline; swallow it so periodic checks never
    // surface as unhandled promise rejections.
    const checkForUpdate = () => {
      registration.update().catch(() => {})
    }
    // Periodic update check while the tab stays open.
    setInterval(checkForUpdate, 30 * 60 * 1000)
    // Re-check when the user returns to the tab (covers long backgrounded sessions).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate()
      }
    })
  }
})
