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
  const active = listRef.value.querySelector('.verse-item.active')
  if (active) {
    active.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
})
</script>

<template>
  <div v-if="store.verses.length > 0">
    <div class="verse-list-header">
      <h4>All Verses</h4>
    </div>
    <div ref="listRef" class="verse-list">
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

<style scoped>
.verse-list-header {
  padding: 1rem 0 0.5rem;
  border-top: 1px solid var(--border);
  margin-top: 0.5rem;
}

.verse-list-header h4 {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-light);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0;
}

.verse-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 2rem;
}
</style>
