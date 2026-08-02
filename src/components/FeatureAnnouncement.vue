<script setup>
import { ref, onMounted } from 'vue'
import { STORAGE_KEY, FOOTNOTES_ANNOUNCED_KEY } from '../config.js'

const show = ref(false)

function isReturningUser() {
  try {
    return !!localStorage.getItem(STORAGE_KEY)
  } catch {
    return false
  }
}

function wasAnnounced() {
  try {
    return localStorage.getItem(FOOTNOTES_ANNOUNCED_KEY) === '1'
  } catch {
    return true
  }
}

function dismiss() {
  show.value = false
  try {
    localStorage.setItem(FOOTNOTES_ANNOUNCED_KEY, '1')
  } catch {
    // Ignore private mode / quota errors.
  }
}

onMounted(() => {
  // Only greet people who already use the app; first-time visitors just get the feature.
  if (!isReturningUser() || wasAnnounced()) {
    return
  }
  // Small delay so it does not compete with the initial surah load chrome.
  setTimeout(() => {
    if (!wasAnnounced()) {
      show.value = true
    }
  }, 1200)
})
</script>

<template>
  <Transition name="feature-toast">
    <div
      v-if="show"
      class="fixed left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-card border border-border rounded-xl shadow-2xl px-4 py-3.5 flex items-start gap-3"
      style="top: calc(var(--header-height, 4.5rem) + 4.75rem)"
      role="status"
      :aria-label="$t('feature.footnotesTitle')"
    >
      <div
        class="shrink-0 mt-0.5 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
          />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-body">{{ $t('feature.footnotesTitle') }}</p>
        <p class="text-xs text-muted mt-1 leading-relaxed">
          {{ $t('feature.footnotesBody') }}
        </p>
        <button
          type="button"
          class="mt-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
          @click="dismiss"
        >
          {{ $t('feature.gotIt') }}
        </button>
      </div>
      <button
        type="button"
        class="shrink-0 text-muted cursor-pointer p-1 -mt-0.5 -mr-1"
        :aria-label="$t('feature.dismiss')"
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
.feature-toast-enter-active,
.feature-toast-leave-active {
  transition:
    opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1),
    transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}
.feature-toast-enter-from,
.feature-toast-leave-to {
  opacity: 0;
  transform: translateY(-0.75rem);
}
</style>
