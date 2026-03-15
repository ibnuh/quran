<script setup>
import { ref } from 'vue'

const props = defineProps({
  progress: { type: Number, default: 0 },
  buffered: { type: Number, default: 0 },
  currentTimeMs: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 }
})
const emit = defineEmits(['seek'])

const isDragging = ref(false)
const barRef = ref(null)

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getSeekRatio(e) {
  const rect = barRef.value.getBoundingClientRect()
  return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
}

function onClick(e) {
  emit('seek', getSeekRatio(e))
}

function onMouseDown(e) {
  isDragging.value = true
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e) {
  if (isDragging.value) {
    emit('seek', getSeekRatio(e))
  }
}

function onMouseUp(e) {
  if (isDragging.value) {
    isDragging.value = false
    emit('seek', getSeekRatio(e))
  }
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

function onTouchStart() {
  isDragging.value = true
}

function onTouchMove(e) {
  if (isDragging.value && e.touches[0]) {
    const rect = barRef.value.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width))
    emit('seek', ratio)
  }
}

function onTouchEnd() {
  isDragging.value = false
}
</script>

<template>
  <div>
    <div
      ref="barRef"
      class="progress-bar group"
      role="slider"
      aria-label="Seek audio"
      :aria-valuenow="Math.round(progress)"
      aria-valuemin="0"
      aria-valuemax="100"
      tabindex="0"
      @click="onClick"
      @mousedown.prevent="onMouseDown"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <div class="progress-buffered" :style="{ width: buffered + '%' }"></div>
      <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      <div
        class="progress-thumb"
        :class="{ 'progress-thumb-active': isDragging }"
        :style="{ left: progress + '%' }"
      ></div>
    </div>
    <div v-if="durationMs > 0" class="flex justify-between mt-1">
      <span class="text-[0.65rem] text-muted tabular-nums">{{ formatTime(currentTimeMs) }}</span>
      <span class="text-[0.65rem] text-muted tabular-nums">{{ formatTime(durationMs) }}</span>
    </div>
  </div>
</template>

<style scoped>
.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  overflow: visible;
  transition: height 0.15s ease;
}
.progress-bar:hover {
  height: 8px;
}
.progress-buffered {
  position: absolute;
  inset: 0;
  height: 100%;
  border-radius: 3px;
  background: color-mix(in srgb, var(--color-muted) 30%, transparent);
  pointer-events: none;
}
.progress-fill {
  position: absolute;
  inset: 0;
  height: 100%;
  border-radius: 3px;
  background: var(--color-primary);
  transition: width 0.1s linear;
  pointer-events: none;
}
.progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-primary);
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.15s ease;
  pointer-events: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.progress-bar:hover .progress-thumb,
.progress-thumb-active {
  transform: translate(-50%, -50%) scale(1) !important;
}
</style>
