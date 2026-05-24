import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import { STORAGE_KEY } from './config.js'
import { applyThemeToDocument } from './data/themes.js'
import './assets/styles/main.css'

// Apply saved display preferences before the app mounts so the OS/browser status
// bar (theme-color meta), CSS variables, and the animations setting are correct on
// first paint, instead of briefly showing the defaults (green status bar, entrance
// animations) before the store applies them in onMounted.
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  if (saved.theme) {
    applyThemeToDocument(saved.theme)
  }
  if (saved.animations === false) {
    document.documentElement.classList.add('no-animations')
  }
} catch {
  // Ignore corrupt/unavailable storage; the store applies these on load too.
}

// Capture PWA install prompt globally (fires before components mount)
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  window.__pwaInstallPrompt = e
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
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
