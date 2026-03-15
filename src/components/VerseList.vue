<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import VerseItem from './VerseItem.vue'

const store = usePlayerStore()
const listRef = ref(null)
const panelRef = ref(null)
const emit = defineEmits(['close', 'select'])
let previouslyFocused = null

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Tab' && panelRef.value) {
    const focusable = panelRef.value.querySelectorAll('button, [tabindex]:not([tabindex="-1"])')
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

function scrollToActive(smooth = false) {
  if (!listRef.value) return
  const active = listRef.value.querySelector('.verse-active')
  if (active) {
    active.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' })
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement
  document.addEventListener('keydown', onKeydown)
  nextTick(() => scrollToActive())
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  if (previouslyFocused) previouslyFocused.focus()
})

watch(() => store.currentVerseIndex, async () => {
  await nextTick()
  scrollToActive(true)
})
</script>

<template>
  <Transition name="panel" appear>
    <div class="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Verse list" aria-modal="true">
      <div class="absolute inset-0 bg-black/40" @click="emit('close')"></div>

      <div ref="panelRef" class="relative w-full sm:max-w-md h-full shadow-2xl">
        <div class="bg-card h-full overflow-y-auto">
          <div class="sticky top-0 bg-card z-10 flex items-center justify-between px-4 pb-3 border-b border-border" style="padding-top: max(0.75rem, env(safe-area-inset-top, 0px))">
            <h3 class="text-sm font-semibold text-muted uppercase tracking-wider">All Verses</h3>
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface transition-colors text-muted cursor-pointer"
              aria-label="Close verse list"
              @click="emit('close')"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <div ref="listRef" class="p-3 space-y-2" style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px))">
            <VerseItem
              v-for="(verse, i) in store.verses"
              :key="verse.number"
              :verse="verse"
              :translation="store.translationVerses[i]"
              :is-active="i === store.currentVerseIndex"
              :class="{ 'verse-active': i === store.currentVerseIndex }"
              class="scroll-mt-16"
              @select="emit('select', i); emit('close')"
            />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s ease;
}
.panel-enter-active > :last-child,
.panel-leave-active > :last-child {
  transition: transform 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}
.panel-enter-from > :last-child {
  transform: translateX(100%);
}
.panel-leave-to > :last-child {
  transform: translateX(100%);
}
</style>
