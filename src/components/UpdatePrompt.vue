<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const show = ref(false)
const applying = ref(false)
let updateFn = null

function onUpdateAvailable(e) {
  updateFn = e.detail.updateSW
  // Don't re-show the toast while a reload is already in progress.
  if (!applying.value) {
    show.value = true
  }
}

/**
 * Activate the waiting service worker, then reload once it controls the page.
 * Posts SKIP_WAITING directly to registration.waiting (more reliable than only
 * going through workbox-window's internal handle) and waits for controllerchange.
 */
async function applyUpdate() {
  if (applying.value) {
    return
  }
  applying.value = true
  show.value = false

  const waitForController = () =>
    new Promise(resolve => {
      // Already controlled by a newly activated worker (rare but possible).
      let settled = false
      const finish = () => {
        if (settled) {
          return
        }
        settled = true
        resolve()
      }
      navigator.serviceWorker?.addEventListener('controllerchange', finish, { once: true })
      // Fallback if clientsClaim is missing on an older waiting worker.
      setTimeout(finish, 2000)
    })

  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    // Also invoke vite-plugin-pwa helper (messageSkipWaiting via workbox-window).
    if (updateFn) {
      await Promise.resolve(updateFn(true))
    }
    await waitForController()
  } catch {
    // Still attempt a reload; a full navigation is the recovery path.
  }

  window.location.reload()
}

function dismiss() {
  show.value = false
  // Don't show again this session even if onNeedRefresh fires again
  window.removeEventListener('sw-update-available', onUpdateAvailable)
}

onMounted(() => window.addEventListener('sw-update-available', onUpdateAvailable))
onBeforeUnmount(() => window.removeEventListener('sw-update-available', onUpdateAvailable))
</script>

<template>
  <Transition name="update-toast">
    <div
      v-if="show"
      class="fixed left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-30 bg-card border border-border rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3"
      style="top: calc(var(--header-height, 4.5rem) + 0.5rem)"
    >
      <svg
        class="shrink-0 text-primary"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          d="M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79s7.15 2.71 9.88 0C18.32 15.65 19 14.08 19 12.1h2c0 2.48-.92 4.95-2.76 6.81-3.66 3.72-9.64 3.72-13.3.02s-3.67-9.69 0-13.41 9.64-3.72 13.3 0L21 2.78V10.12z"
        />
      </svg>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-body">{{ $t('update.available') }}</p>
        <p class="text-xs text-muted">{{ $t('update.ready') }}</p>
      </div>
      <button
        class="shrink-0 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer hover:bg-primary-dark transition-colors"
        @click="applyUpdate"
      >
        {{ $t('update.update') }}
      </button>
      <button
        class="shrink-0 text-muted cursor-pointer p-1"
        :aria-label="$t('update.dismiss')"
        @click="dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.update-toast-enter-active,
.update-toast-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.update-toast-enter-from,
.update-toast-leave-to {
  opacity: 0;
  transform: translateY(-1rem);
}
</style>
