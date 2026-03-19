<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['close'])

const shortcuts = [
  { keys: ['Space'], action: 'Play / Pause' },
  { keys: ['\u2190'], action: 'Previous verse' },
  { keys: ['\u2192'], action: 'Next verse' },
  { keys: ['?'], action: 'Toggle this help' }
]

function onKeydown(e) {
  if (e.key === 'Escape' || e.key === '?') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="shortcuts">
    <div class="fixed top-0 right-0 bottom-0 left-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Keyboard shortcuts">
      <div class="absolute top-0 right-0 bottom-0 left-0 bg-black/40 backdrop-blur-sm" @click="emit('close')"></div>

      <div class="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-base font-semibold text-body">Keyboard Shortcuts</h2>
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface transition-colors text-muted cursor-pointer"
            aria-label="Close shortcuts"
            @click="emit('close')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="s in shortcuts"
            :key="s.action"
            class="flex items-center justify-between"
          >
            <span class="text-sm text-body">{{ s.action }}</span>
            <div class="flex gap-1">
              <kbd
                v-for="key in s.keys"
                :key="key"
                class="kbd"
              >{{ key }}</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 600;
  border-radius: 0.375rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-muted);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.shortcuts-enter-active {
  transition: opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.shortcuts-leave-active {
  transition: opacity 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.shortcuts-enter-active > :last-child {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.shortcuts-leave-active > :last-child {
  transition: transform 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.shortcuts-enter-from,
.shortcuts-leave-to {
  opacity: 0;
}
.shortcuts-enter-from > :last-child {
  transform: scale(0.95);
}
.shortcuts-leave-to > :last-child {
  transform: scale(0.95);
}
</style>
