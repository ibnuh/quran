import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import './assets/styles/main.css'

// Capture PWA install prompt globally (fires before components mount)
window.addEventListener('beforeinstallprompt', (e) => {
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
