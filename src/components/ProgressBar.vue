<script setup>
defineProps({
  progress: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['seek'])

function onClick(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  emit('seek', ratio)
}
</script>

<template>
  <div class="progress-container" @click="onClick">
    <div class="progress-bar" :style="{ width: progress + '%' }"></div>
  </div>
</template>

<style scoped>
.progress-container {
  width: 100%;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 0.1s linear;
}
</style>
