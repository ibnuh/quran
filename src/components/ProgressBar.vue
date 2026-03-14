<script setup>
defineProps({
  progress: { type: Number, default: 0 }
})
const emit = defineEmits(['seek'])

function onClick(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  emit('seek', ratio)
}
</script>

<template>
  <div class="w-full h-1 bg-border rounded-sm cursor-pointer relative overflow-hidden" @click="onClick">
    <div class="h-full bg-primary rounded-sm transition-[width] duration-100 ease-linear" :style="{ width: progress + '%' }"></div>
  </div>
</template>
