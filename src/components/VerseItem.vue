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
    class="flex gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 bg-card border items-start"
    :class="isActive
      ? 'border-primary bg-primary-light'
      : 'border-transparent hover:border-border hover:shadow-sm'"
    @click="$emit('select')"
  >
    <div
      class="shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-xs font-semibold mt-1"
      :class="isActive
        ? 'bg-primary text-white border-primary'
        : 'bg-surface text-muted border-border'"
    >{{ verse.number }}</div>
    <div class="flex-1 min-w-0">
      <p class="font-arabic text-xl sm:text-[1.35rem] leading-[1.8] text-arabic text-right mb-1" dir="rtl">
        {{ verse.text }}
      </p>
      <p class="text-sm sm:text-[0.85rem] leading-normal text-muted">
        {{ translation.text }}
      </p>
    </div>
  </div>
</template>
