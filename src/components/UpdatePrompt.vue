<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { applyWaitingServiceWorker, markSwJustUpdated } from '../utils/swAudio.js'

const show = ref(false)
const applying = ref(false)
let updateFn = null

function onUpdateAvailable(e) {
  updateFn = e.detail?.updateSW || updateFn
  // Don't re-show the toast while a reload is already in progress.
  if (!applying.value) {
    show.value = true
  }
}

/**
 * Activate the waiting service worker only after the user clicks Update.
 * Never auto-activate: vite skipWaiting is false, and we only post SKIP_WAITING here.
 */
async function applyUpdate() {
  if (applying.value) {
    return
  }
  applying.value = true
  // Keep the toast visible so the user sees progress before reload.

  try {
    // Drop cached MP3s before the new SW claims clients. Stale CacheFirst range
    // entries are what make mid-surah Play dead until a hard reload.
    await applyWaitingServiceWorker({
      updateSW: updateFn,
      reloadTimeoutMs: 2500
    })
  } catch {
    // Still attempt a reload; a full navigation is the recovery path.
    markSwJustUpdated()
    window.location.reload()
  }
}

function dismiss() {
  if (applying.value) {
    return
  }
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
      class="update-toast fixed left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-card border border-border rounded-xl shadow-2xl px-4 py-3.5 flex items-start gap-3"
      style="top: calc(var(--header-height, 4.5rem) + 0.5rem)"
      role="status"
      :aria-live="applying ? 'assertive' : 'polite'"
      :aria-busy="applying ? 'true' : 'false'"
    >
      <div
        class="update-icon shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center"
        :class="applying ? 'bg-primary/15 text-primary' : 'bg-primary/10 text-primary'"
        aria-hidden="true"
      >
        <svg v-if="!applying" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79s7.15 2.71 9.88 0C18.32 15.65 19 14.08 19 12.1h2c0 2.48-.92 4.95-2.76 6.81-3.66 3.72-9.64 3.72-13.3.02s-3.67-9.69 0-13.41 9.64-3.72 13.3 0L21 2.78V10.12z"
          />
        </svg>
        <svg v-else class="update-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" opacity="0.25" />
          <path
            d="M21 12a9 9 0 00-9-9"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </svg>
      </div>

      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-body">
          {{ applying ? $t('update.applyingTitle') : $t('update.available') }}
        </p>
        <p class="text-xs text-muted mt-0.5 leading-relaxed">
          {{ applying ? $t('update.applyingBody') : $t('update.ready') }}
        </p>
        <div v-if="!applying" class="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            class="shrink-0 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer hover:bg-primary-dark transition-colors"
            @click="applyUpdate"
          >
            {{ $t('update.update') }}
          </button>
          <button
            type="button"
            class="shrink-0 text-xs font-medium text-muted hover:text-body px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
            @click="dismiss"
          >
            {{ $t('update.later') }}
          </button>
        </div>
        <p v-else class="mt-2 text-[0.7rem] text-primary font-medium tabular-nums">
          {{ $t('update.applyingProgress') }}
        </p>
      </div>

      <button
        v-if="!applying"
        type="button"
        class="shrink-0 text-muted cursor-pointer p-1 -mt-0.5 -mr-1"
        :aria-label="$t('update.dismiss')"
        @click="dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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

.update-spinner {
  animation: update-spin 0.75s linear infinite;
}
@keyframes update-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .update-spinner {
    animation: none;
  }
}
</style>
