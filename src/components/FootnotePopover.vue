<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { useFocusTrap } from '../composables/useFocusTrap.js'
import { fetchFootnote } from '../services/api.js'

const props = defineProps({
  footnoteId: { type: Number, required: true },
  label: { type: String, default: '' },
  // DOMRect-like { top, left, bottom, right, width, height } of the trigger, or null.
  anchor: { type: Object, default: null }
})

const emit = defineEmits(['close'])

const panelRef = ref(null)
const loading = ref(false)
const error = ref(false)
const text = ref('')

useFocusTrap(panelRef, { onEscape: () => emit('close') })

let requestId = 0
async function load() {
  const id = props.footnoteId
  const req = ++requestId
  loading.value = true
  error.value = false
  text.value = ''
  try {
    // fetchFootnote is deduped + memory-cached in the API layer.
    const data = await fetchFootnote(id)
    if (req !== requestId) {
      return
    }
    text.value = data.text
  } catch {
    if (req !== requestId) {
      return
    }
    error.value = true
  } finally {
    if (req === requestId) {
      loading.value = false
    }
  }
}

onMounted(load)
watch(() => props.footnoteId, load)

// Desktop: position near the trigger. Mobile: bottom sheet via CSS.
const positionStyle = ref({})

function updatePosition() {
  const a = props.anchor
  if (!a || typeof window === 'undefined') {
    positionStyle.value = {}
    return
  }
  // Below sm breakpoint the sheet is fixed to the bottom; skip absolute anchoring.
  if (window.matchMedia('(max-width: 639px)').matches) {
    positionStyle.value = {}
    return
  }

  const margin = 8
  const width = Math.min(360, window.innerWidth - 24)
  let left = a.left + a.width / 2 - width / 2
  left = Math.max(12, Math.min(left, window.innerWidth - width - 12))

  const spaceBelow = window.innerHeight - a.bottom
  const preferBelow = spaceBelow >= 160 || spaceBelow >= a.top

  if (preferBelow) {
    positionStyle.value = {
      position: 'fixed',
      top: `${a.bottom + margin}px`,
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${Math.min(280, spaceBelow - 16)}px`
    }
  } else {
    positionStyle.value = {
      position: 'fixed',
      bottom: `${window.innerHeight - a.top + margin}px`,
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${Math.min(280, a.top - 16)}px`
    }
  }
}

onMounted(() => nextTick(updatePosition))
watch(() => props.anchor, () => nextTick(updatePosition), { deep: true })
</script>

<template>
  <Transition name="fn-pop" appear>
    <div class="fn-root fixed inset-0 z-50" role="presentation">
      <div class="fn-backdrop absolute inset-0 bg-black/40 sm:bg-black/20" @click="emit('close')"></div>

      <div
        ref="panelRef"
        class="fn-panel bg-card border border-border shadow-xl flex flex-col"
        role="dialog"
        :aria-label="$t('verse.footnoteTitle', { n: label })"
        aria-modal="true"
        :style="positionStyle"
      >
        <div class="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
          <h3 class="text-sm font-semibold text-body truncate">
            {{ $t('verse.footnoteTitle', { n: label }) }}
          </h3>
          <button
            type="button"
            class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface transition-colors text-muted cursor-pointer shrink-0"
            :aria-label="$t('verse.closeFootnote')"
            @click="emit('close')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-3 py-3 min-h-0">
          <p v-if="loading" class="text-sm text-muted text-center py-4">
            {{ $t('verse.loadingFootnote') }}
          </p>
          <div v-else-if="error" class="text-center py-4">
            <p class="text-sm text-muted mb-3">{{ $t('verse.footnoteError') }}</p>
            <button
              type="button"
              class="bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-lg text-sm cursor-pointer transition-colors"
              @click="load"
            >
              {{ $t('verse.retry') }}
            </button>
          </div>
          <p v-else class="text-sm text-body leading-relaxed whitespace-pre-wrap">{{ text }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Mobile: bottom sheet */
.fn-panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: min(50vh, 360px);
  border-radius: 1rem 1rem 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Desktop / tablet: floating card; position set via inline style */
@media (min-width: 640px) {
  .fn-panel {
    left: auto;
    right: auto;
    bottom: auto;
    border-radius: 0.75rem;
    padding-bottom: 0;
  }
}

.fn-pop-enter-active {
  transition: opacity 0.18s cubic-bezier(0.25, 1, 0.5, 1);
}
.fn-pop-leave-active {
  transition: opacity 0.12s cubic-bezier(0.25, 1, 0.5, 1);
}
.fn-pop-enter-active .fn-panel {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.fn-pop-leave-active .fn-panel {
  transition: transform 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.fn-pop-enter-from,
.fn-pop-leave-to {
  opacity: 0;
}
.fn-pop-enter-from .fn-panel,
.fn-pop-leave-to .fn-panel {
  transform: translateY(12px);
}

@media (min-width: 640px) {
  .fn-pop-enter-from .fn-panel,
  .fn-pop-leave-to .fn-panel {
    transform: translateY(6px) scale(0.98);
  }
}
</style>
