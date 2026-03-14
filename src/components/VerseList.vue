<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import VerseItem from './VerseItem.vue'

const store = usePlayerStore()
const listRef = ref(null)
const emit = defineEmits(['close', 'select'])

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

watch(() => store.currentVerseIndex, async () => {
  await nextTick()
  if (!listRef.value) return
  const active = listRef.value.querySelector('.border-primary')
  if (active) {
    active.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
})
</script>

<template>
  <Transition name="panel">
    <div class="fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-black/40" @click="emit('close')"></div>

      <div class="relative w-full sm:max-w-md bg-card h-full overflow-y-auto shadow-2xl">
        <div class="sticky top-0 bg-card z-10 flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 class="text-sm font-semibold text-muted uppercase tracking-wider">All Verses</h3>
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface transition-colors text-muted cursor-pointer"
            @click="emit('close')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div ref="listRef" class="p-3 space-y-2">
          <VerseItem
            v-for="(verse, i) in store.verses"
            :key="verse.number"
            :verse="verse"
            :translation="store.translationVerses[i]"
            :is-active="i === store.currentVerseIndex"
            @select="emit('select', i); emit('close')"
          />
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
