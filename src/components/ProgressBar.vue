<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  progress: { type: Number, default: 0 },
  buffered: { type: Number, default: 0 },
  currentTimeMs: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
  isLoading: Boolean,
  isSeeking: Boolean
})
const emit = defineEmits(['seek'])
const { t } = useI18n()

const isDragging = ref(false)
const barRef = ref(null)
const previewRatio = ref(null)

const displayRatio = computed(() =>
  previewRatio.value == null ? props.progress / 100 : previewRatio.value
)
const displayProgress = computed(() => Math.max(0, Math.min(100, displayRatio.value * 100)))
const displayTimeMs = computed(() =>
  previewRatio.value == null || props.durationMs <= 0
    ? props.currentTimeMs
    : previewRatio.value * props.durationMs
)
const isBusy = computed(() => props.isLoading || props.isSeeking)

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const valueText = computed(() => {
  if (props.durationMs > 0) {
    return t('controls.seekValueOf', {
      current: formatTime(displayTimeMs.value),
      total: formatTime(props.durationMs)
    })
  }
  return t('controls.noAudioLoaded')
})

// In RTL layouts (Arabic/Urdu UI set dir="rtl" on the root) the track fills from
// the right, so pointer math and horizontal arrow keys must mirror.
function isRtl() {
  const dirEl = barRef.value?.closest?.('[dir]')
  return (dirEl?.getAttribute('dir') || '').toLowerCase() === 'rtl'
}

function onKeydown(e) {
  // Horizontal arrows follow the visual direction, matching native range inputs.
  const increaseKey = isRtl() ? 'ArrowLeft' : 'ArrowRight'
  const decreaseKey = isRtl() ? 'ArrowRight' : 'ArrowLeft'
  if (e.key === increaseKey || e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    const step = e.shiftKey ? 0.1 : 0.02
    emit('seek', Math.min(1, displayRatio.value + step))
  } else if (e.key === decreaseKey || e.key === 'ArrowDown') {
    e.preventDefault()
    e.stopPropagation()
    const step = e.shiftKey ? 0.1 : 0.02
    emit('seek', Math.max(0, displayRatio.value - step))
  } else if (e.key === 'Home') {
    e.preventDefault()
    e.stopPropagation()
    emit('seek', 0)
  } else if (e.key === 'End') {
    e.preventDefault()
    e.stopPropagation()
    emit('seek', 1)
  }
}

function getSeekRatio(e) {
  const rect = barRef.value.getBoundingClientRect()
  if (rect.width <= 0) {
    return 0
  }
  const raw = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  return isRtl() ? 1 - raw : raw
}

function onPointerDown(e) {
  isDragging.value = true
  previewRatio.value = getSeekRatio(e)
  barRef.value?.setPointerCapture?.(e.pointerId)
}

function onPointerMove(e) {
  if (isDragging.value) {
    previewRatio.value = getSeekRatio(e)
  }
}

function onPointerUp(e) {
  if (!isDragging.value) {
    return
  }
  const ratio = getSeekRatio(e)
  isDragging.value = false
  previewRatio.value = null
  barRef.value?.releasePointerCapture?.(e.pointerId)
  emit('seek', ratio)
}

function onPointerCancel(e) {
  isDragging.value = false
  previewRatio.value = null
  barRef.value?.releasePointerCapture?.(e.pointerId)
}
</script>

<template>
  <div>
    <div
      ref="barRef"
      class="progress-wrapper group"
      :class="{ 'progress-wrapper-busy': isBusy }"
      role="slider"
      :aria-label="$t('controls.seek')"
      :aria-valuenow="Math.round(displayProgress)"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-busy="isBusy"
      :aria-valuetext="valueText"
      tabindex="0"
      @pointerdown.prevent="onPointerDown"
      @pointermove.prevent="onPointerMove"
      @pointerup.prevent="onPointerUp"
      @pointercancel="onPointerCancel"
      @keydown="onKeydown"
    >
      <div class="progress-track">
        <div class="progress-buffered" :style="{ width: buffered + '%' }"></div>
        <div class="progress-fill" :style="{ width: displayProgress + '%' }"></div>
        <div v-if="isBusy" class="progress-pending" aria-hidden="true"></div>
      </div>
      <div
        class="progress-thumb"
        :class="{ 'progress-thumb-active': isDragging }"
        :style="{ insetInlineStart: displayProgress + '%' }"
      ></div>
    </div>
    <div class="flex justify-between mt-1.5" :class="durationMs > 0 ? '' : 'invisible'">
      <span class="text-[0.65rem] text-muted tabular-nums">{{ formatTime(displayTimeMs) }}</span>
      <span class="text-[0.65rem] text-muted tabular-nums">{{ formatTime(durationMs) }}</span>
    </div>
  </div>
</template>

<style scoped>
.progress-wrapper {
  width: 100%;
  height: 16px;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  touch-action: none;
}
.progress-track {
  width: 100%;
  height: 4px;
  border-radius: 9999px;
  background: var(--color-border);
  position: relative;
  transition:
    transform 0.2s cubic-bezier(0.25, 1, 0.5, 1),
    height 0.2s cubic-bezier(0.25, 1, 0.5, 1);
  transform-origin: center;
  overflow: hidden;
}
.progress-wrapper:hover .progress-track,
.progress-wrapper:focus-visible .progress-track {
  height: 6px;
}
/* Anchor to the inline start so the elapsed part grows from the right in RTL. */
.progress-buffered {
  position: absolute;
  top: 0;
  bottom: 0;
  inset-inline-start: 0;
  height: 100%;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-muted) 28%, transparent);
  pointer-events: none;
}
.progress-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  inset-inline-start: 0;
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-primary) 88%, #000) 0%,
    var(--color-primary) 100%
  );
  pointer-events: none;
}
.progress-pending {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 22%;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-primary) 55%, transparent);
  animation: progress-pending 1s ease-in-out infinite;
  pointer-events: none;
}
@keyframes progress-pending {
  from {
    transform: translateX(-110%);
  }
  to {
    transform: translateX(560%);
  }
}
/* Horizontal centering uses a logical margin (not translateX) so the thumb sits
   on the playhead in both LTR and RTL layouts. */
.progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  margin-inline-start: -7px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid color-mix(in srgb, var(--color-card) 90%, #fff);
  transform: translateY(-50%) scale(0);
  transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
  pointer-events: none;
  box-shadow: 0 1px 4px color-mix(in srgb, #000 18%, transparent);
  z-index: 1;
}
.progress-wrapper:hover .progress-thumb,
.progress-wrapper:focus-visible .progress-thumb,
.progress-thumb-active {
  transform: translateY(-50%) scale(1) !important;
}
.progress-thumb-active {
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--color-primary) 20%, transparent),
    0 1px 4px color-mix(in srgb, #000 18%, transparent);
}

@media (pointer: coarse) {
  .progress-wrapper {
    height: 44px;
  }
  .progress-track {
    height: 5px;
  }
  .progress-thumb {
    width: 18px;
    height: 18px;
    margin-inline-start: -9px;
    transform: translateY(-50%) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .progress-pending {
    left: 39%;
    animation: none;
  }
}
</style>
