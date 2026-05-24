<script setup>
import { onErrorCaptured, ref, defineAsyncComponent } from 'vue'
import UpdatePrompt from './components/UpdatePrompt.vue'
import InstallPrompt from './components/InstallPrompt.vue'

const DebugPanel = defineAsyncComponent(() => import('./components/DebugPanel.vue'))

const hasError = ref(false)
const errorMessage = ref('')

// Debug overlay: ?debug=1 enables (and persists), ?debug=0 disables.
const showDebug = ref(false)
try {
  const flag = new URLSearchParams(window.location.search).get('debug')
  if (flag === '1') {
    localStorage.setItem('quran-debug', '1')
  } else if (flag === '0') {
    localStorage.removeItem('quran-debug')
  }
  showDebug.value = localStorage.getItem('quran-debug') === '1'
} catch {
  showDebug.value = false
}

onErrorCaptured((err) => {
  console.error('App error:', err)
  hasError.value = true
  errorMessage.value = err.message || 'Something went wrong'
  return false
})

function reload() {
  window.location.reload()
}
</script>

<template>
  <div v-if="hasError" class="fixed top-0 right-0 bottom-0 left-0 flex flex-col items-center justify-center bg-surface text-center px-6">
    <svg class="w-12 h-12 text-primary mb-4 opacity-60" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
    <h1 class="text-lg font-semibold text-body mb-2">Something went wrong</h1>
    <p class="text-sm text-muted mb-6">{{ errorMessage }}</p>
    <button
      class="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
      @click="reload"
    >
      Reload App
    </button>
  </div>
  <router-view v-else />

  <UpdatePrompt />
  <InstallPrompt />
  <DebugPanel v-if="showDebug" />

  <!-- Screen reader announcements -->
  <div aria-live="polite" aria-atomic="true" class="sr-only" id="sr-announcements"></div>
</template>

<style>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
