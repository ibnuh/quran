<script setup>
import { ref, watch, nextTick } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import VerseItem from './VerseItem.vue'

const store = usePlayerStore()
const listRef = ref(null)

defineEmits(['select'])

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
  <div v-if="store.verses.length > 0">
    <div class="pt-4 pb-2 mt-2 border-t border-border">
      <h4 class="text-sm font-semibold text-muted uppercase tracking-wider">All Verses</h4>
    </div>
    <div ref="listRef" class="flex flex-col gap-2 pb-8">
      <VerseItem
        v-for="(verse, i) in store.verses"
        :key="verse.number"
        :verse="verse"
        :translation="store.translationVerses[i]"
        :is-active="i === store.currentVerseIndex"
        @select="$emit('select', i)"
      />
    </div>
  </div>
</template>
