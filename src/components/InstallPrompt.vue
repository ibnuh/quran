<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const show = ref(false)
let deferredPrompt = null
const DISMISSED_KEY = 'quran-pwa-install-dismissed'

function onBeforeInstall(e) {
  e.preventDefault()
  deferredPrompt = e

  // Don't show if user dismissed before or already installed
  const dismissed = localStorage.getItem(DISMISSED_KEY)
  if (dismissed) return

  // Delay slightly so it doesn't appear immediately on first visit
  setTimeout(() => { show.value = true }, 3000)
}

async function install() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  if (outcome === 'accepted') {
    show.value = false
  }
  deferredPrompt = null
}

function dismiss() {
  show.value = false
  localStorage.setItem(DISMISSED_KEY, '1')
}

// Hide if app gets installed while prompt is showing
function onInstalled() {
  show.value = false
  deferredPrompt = null
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onBeforeInstall)
  window.addEventListener('appinstalled', onInstalled)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  window.removeEventListener('appinstalled', onInstalled)
})
</script>

<template>
  <Transition name="install-toast">
    <div
      v-if="show"
      class="fixed left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-30 bg-card border border-border rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3"
      style="top: calc(var(--header-height, 4.5rem) + 0.5rem)"
    >
      <svg class="shrink-0 text-primary" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3h-2zm-1-4l-1.41-1.41L13 12.17V4h-2v8.17L8.41 9.59 7 11l5 5 5-5z"/>
      </svg>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-body">Install App</p>
        <p class="text-xs text-muted">Add to your home screen for quick access.</p>
      </div>
      <button
        class="shrink-0 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer hover:bg-primary-dark transition-colors"
        @click="install"
      >Install</button>
      <button
        class="shrink-0 text-muted cursor-pointer p-1"
        aria-label="Dismiss"
        @click="dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.install-toast-enter-active,
.install-toast-leave-active {
  transition: all 0.3s ease;
}
.install-toast-enter-from,
.install-toast-leave-to {
  opacity: 0;
  transform: translateY(-1rem);
}
</style>
