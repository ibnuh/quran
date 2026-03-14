<script setup>
defineProps({
  verse: { type: Object, required: true },
  translation: { type: Object, required: true },
  isActive: Boolean
})

defineEmits(['select'])
</script>

<template>
  <div
    class="verse-item"
    :class="{ active: isActive }"
    @click="$emit('select')"
  >
    <div class="verse-item-num">{{ verse.number }}</div>
    <div class="verse-item-text">
      <p class="verse-item-arabic" dir="rtl">{{ verse.text }}</p>
      <p class="verse-item-translation">{{ translation.text }}</p>
    </div>
  </div>
</template>

<style scoped>
.verse-item {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
  background: var(--bg-card);
  border: 1px solid transparent;
  align-items: flex-start;
}

.verse-item:hover {
  border-color: var(--border);
  box-shadow: var(--shadow);
}

.verse-item.active {
  border-color: var(--primary);
  background: var(--primary-light);
}

.verse-item.active .verse-item-num {
  background: var(--primary);
  color: #fff;
}

.verse-item-num {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-light);
  margin-top: 0.25rem;
}

.verse-item-text {
  flex: 1;
  min-width: 0;
}

.verse-item-arabic {
  font-family: 'Amiri', serif;
  font-size: 1.35rem;
  line-height: 1.8;
  color: var(--text-arabic);
  direction: rtl;
  text-align: right;
  margin: 0 0 0.35rem;
}

.verse-item-translation {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-light);
  margin: 0;
}

@media (max-width: 640px) {
  .verse-item-arabic {
    font-size: 1.15rem;
  }
  .verse-item-translation {
    font-size: 0.8rem;
  }
}
</style>
