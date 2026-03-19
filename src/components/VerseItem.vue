<script setup>
import { usePlayerStore } from '../stores/player.js'

const store = usePlayerStore()

defineProps({
  verse: { type: Object, required: true },
  translation: { type: Object, required: true },
  isActive: Boolean
})
defineEmits(['select'])
</script>

<template>
  <button
    type="button"
    class="verse-item flex gap-3 p-4 rounded-lg cursor-pointer bg-card border items-start w-full text-left"
    :class="isActive
      ? 'border-primary bg-primary-light border-l-[3px]'
      : 'border-transparent hover:border-border hover:shadow-sm'"
    @click="$emit('select')"
  >
    <div
      class="verse-badge shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-xs font-semibold mt-1"
      :class="isActive
        ? 'bg-primary text-white border-primary badge-active'
        : 'bg-surface text-muted border-border'"
    >{{ verse.number }}</div>
    <div class="flex-1 min-w-0">
      <p class="text-xl sm:text-[1.35rem] leading-[1.8] text-arabic text-right mb-1" dir="rtl" lang="ar" :style="{ fontFamily: store.arabicFontFamily }">
        {{ verse.text }}
      </p>
      <p class="text-sm sm:text-[0.85rem] leading-normal text-muted">
        {{ translation.text }}
      </p>
    </div>
  </button>
</template>

<style scoped>
.verse-item {
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.verse-badge {
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.badge-active {
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-primary) 35%, transparent);
}
</style>
