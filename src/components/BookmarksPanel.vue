<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player.js'

const store = usePlayerStore()
const emit = defineEmits(['close', 'select'])
const panelRef = ref(null)
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

function goToBookmark(index) {
  const bm = store.bookmarks[index]
  if (bm) {
    emit('select', bm.surahNum, bm.verseIndex)
    emit('close')
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  if (previouslyFocused) previouslyFocused.focus()
})
</script>

<template>
  <Transition name="panel" appear>
    <div class="fixed top-0 right-0 bottom-0 left-0 z-50 flex justify-end" role="dialog" aria-label="Bookmarks" aria-modal="true">
      <div class="absolute top-0 right-0 bottom-0 left-0 bg-black/40" role="presentation" @click="emit('close')"></div>

      <div ref="panelRef" class="relative w-full sm:max-w-md lg:max-w-lg h-full shadow-2xl">
        <div class="bg-card h-full overflow-y-auto">
          <div class="sticky top-0 bg-card z-10 flex items-center justify-between px-4 pb-3 border-b border-border" style="padding-top: max(0.75rem, env(safe-area-inset-top, 0px))">
            <h3 class="text-sm font-semibold text-muted uppercase tracking-wider">Bookmarks</h3>
            <div class="flex items-center gap-2">
              <button
                v-if="store.bookmarks.length > 0"
                class="text-xs text-muted hover:text-red-500 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-surface"
                @click="store.bookmarks = []; store.savePreferences()"
              >
                Clear all
              </button>
              <button
                class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface transition-colors text-muted cursor-pointer"
                aria-label="Close bookmarks"
                @click="emit('close')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </div>

          <div v-if="store.bookmarks.length === 0" class="flex flex-col items-center justify-center py-20 px-4 text-center">
            <svg class="w-12 h-12 text-muted/30 mb-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
            </svg>
            <p class="text-sm text-muted/60">No bookmarks yet</p>
            <p class="text-xs text-muted/40 mt-1">Tap the bookmark icon on any verse to save it here</p>
          </div>

          <div v-else class="p-4 space-y-2" style="padding-right: max(1rem, env(safe-area-inset-right, 0px))">
            <button
              v-for="(bm, i) in store.bookmarks"
              :key="bm.surahNum + '-' + bm.verseIndex"
              class="w-full text-left p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-surface transition-colors cursor-pointer group"
              @click="goToBookmark(i)"
            >
              <div class="flex items-start justify-between gap-2 mb-1.5">
                <span class="text-xs font-medium text-primary">{{ bm.surahName }} {{ bm.verseNumber }}</span>
                <button
                  class="shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-muted hover:text-red-500 transition-all cursor-pointer"
                  :aria-label="'Remove bookmark for ' + bm.surahName + ' verse ' + bm.verseNumber"
                  @click.stop="store.removeBookmark(i)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
              <p class="text-lg leading-relaxed text-arabic mb-1.5" dir="rtl" lang="ar">{{ bm.verseText }}</p>
              <p class="text-xs text-muted/70 line-clamp-2" v-if="bm.translationText">{{ bm.translationText }}</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.panel-enter-active {
  transition: opacity 0.25s cubic-bezier(0.25, 1, 0.5, 1);
}
.panel-leave-active {
  transition: opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.panel-enter-active > :last-child {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-leave-active > :last-child {
  transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
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
