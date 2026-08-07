<script setup>
import { ref, computed, nextTick, watch, onBeforeUnmount, useId } from 'vue'

const props = defineProps({
  modelValue: [String, Number],
  options: { type: Array, required: true },
  valueKey: { type: String, default: 'value' },
  labelKey: { type: String, default: 'label' },
  placeholder: { type: String, default: 'Search...' },
  ariaLabel: { type: String, default: '' },
  compact: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const query = ref('')
const inputRef = ref(null)
const listboxId = useId()
const highlightedIndex = ref(-1)

const selectedOption = computed(() =>
  props.options.find(o => o[props.valueKey] === props.modelValue)
)
// Fall back to the placeholder so the trigger always has a visible, accessible name.
const selectedLabel = computed(() =>
  selectedOption.value ? selectedOption.value[props.labelKey] : props.placeholder
)
const selectedBadge = computed(() => selectedOption.value?.badge || '')

function fuzzyMatch(text, q) {
  const lower = text.toLowerCase()
  const terms = q.toLowerCase().split(/\s+/)
  return terms.every(term => lower.includes(term))
}

const filtered = computed(() => {
  if (!query.value.trim()) {
    return props.options
  }
  return props.options.filter(o => fuzzyMatch(o[props.labelKey], query.value))
})

// Reset highlighted index when filtered results change
watch(filtered, () => {
  highlightedIndex.value = -1
})

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

function open() {
  isOpen.value = true
  query.value = ''
  highlightedIndex.value = -1
  nextTick(() => {
    if (inputRef.value && !isTouchDevice()) {
      inputRef.value.focus()
    }
  })
  nextTick(() => {
    setTimeout(() => {
      const active = document.querySelector('.option-active')
      if (active) {
        active.scrollIntoView({ block: 'center' })
      }
    }, 50)
  })
}

function close() {
  isOpen.value = false
}

function select(opt) {
  emit('update:modelValue', opt[props.valueKey])
  close()
}

function scrollHighlightedIntoView() {
  nextTick(() => {
    const el = document.querySelector('.option-highlighted')
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightedIndex.value = Math.min(highlightedIndex.value + 1, filtered.value.length - 1)
    scrollHighlightedIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
    scrollHighlightedIntoView()
  } else if (e.key === 'Enter' && highlightedIndex.value >= 0) {
    e.preventDefault()
    select(filtered.value[highlightedIndex.value])
  }
}

watch(isOpen, val => {
  if (val) {
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <button
    type="button"
    class="trigger"
    :class="compact ? 'trigger-compact' : 'trigger-full'"
    :aria-label="ariaLabel || undefined"
    :aria-expanded="isOpen"
    aria-haspopup="listbox"
    :aria-controls="listboxId"
    @click="open"
  >
    <span class="min-w-0 flex-1 flex items-center gap-1.5 truncate">
      <span class="truncate" :class="{ 'opacity-60': !selectedOption }">{{ selectedLabel }}</span>
      <span v-if="selectedBadge" class="ss-badge shrink-0" :title="selectedBadge">{{
        selectedBadge
      }}</span>
    </span>
    <svg
      class="shrink-0"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 10l5 5 5-5z" />
    </svg>
  </button>

  <Teleport to="body">
    <Transition name="picker">
      <div
        v-if="isOpen"
        class="fixed top-0 right-0 bottom-0 left-0 z-[60] flex items-start sm:items-center justify-center"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel || placeholder"
      >
        <div
          class="absolute top-0 right-0 bottom-0 left-0 bg-black/40"
          role="presentation"
          @click="close"
        ></div>

        <div
          class="relative bg-card w-full sm:max-w-md sm:rounded-2xl rounded-b-2xl sm:rounded-2xl shadow-2xl max-h-[85dvh] flex flex-col"
        >
          <div class="px-4 pb-2" style="padding-top: max(1rem, env(safe-area-inset-top, 0px))">
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              role="searchbox"
              :placeholder="placeholder"
              :aria-label="placeholder"
              :aria-controls="listboxId"
              class="search-input"
            />
          </div>

          <div :id="listboxId" class="flex-1 overflow-y-auto px-2 pb-3" role="listbox">
            <button
              v-for="(opt, i) in filtered"
              :key="opt[valueKey]"
              type="button"
              role="option"
              :aria-selected="opt[valueKey] === modelValue"
              class="option-item"
              :class="{
                'option-active': opt[valueKey] === modelValue,
                'option-highlighted': i === highlightedIndex
              }"
              @click="select(opt)"
              @mouseenter="highlightedIndex = i"
            >
              <span class="flex-1 min-w-0 flex items-center gap-2 truncate">
                <span class="truncate">{{ opt[labelKey] }}</span>
                <span v-if="opt.badge" class="ss-badge shrink-0" :title="opt.badge">{{
                  opt.badge
                }}</span>
              </span>
              <svg
                v-if="opt[valueKey] === modelValue"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="shrink-0 text-primary"
                aria-hidden="true"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </button>
            <p
              v-if="filtered.length === 0"
              class="text-center text-sm text-muted py-6"
              role="status"
            >
              {{ $t('common.noResults') }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-body);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease;
  font-family: 'Inter', system-ui, sans-serif;
}
.trigger:hover {
  border-color: var(--color-primary);
}
.trigger-full {
  font-size: 0.9rem;
  padding: 0.65rem 0.75rem;
  border-radius: 0.5rem;
}
.trigger-compact {
  font-size: 0.8rem;
  padding: 0.45rem 0.6rem;
  border-radius: 0.375rem;
}

.search-input {
  width: 100%;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.95rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface);
  color: var(--color-body);
  outline: none;
  transition: border-color 0.2s ease;
}
.search-input:focus {
  border-color: var(--color-primary);
}

.ss-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  padding: 0.22rem 0.45rem;
  border-radius: 9999px;
  /* Solid primary + white text: reliable WCAG AA on all themes. */
  color: #ffffff;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  white-space: nowrap;
}

.option-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.7rem 0.75rem;
  border-radius: 0.5rem;
  border: none;
  background: none;
  color: var(--color-body);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}
.option-item:hover,
.option-highlighted {
  background: var(--color-surface);
}
.option-active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 500;
}

.picker-enter-active {
  transition: opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.picker-leave-active {
  transition: opacity 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.picker-enter-active > :last-child {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.picker-leave-active > :last-child {
  transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.picker-enter-from,
.picker-leave-to {
  opacity: 0;
}
.picker-enter-from > :last-child {
  transform: translateY(-100%);
}
.picker-leave-to > :last-child {
  transform: translateY(-100%);
}
@media (min-width: 640px) {
  .picker-enter-from > :last-child {
    transform: scale(0.95) translateY(1rem);
  }
  .picker-leave-to > :last-child {
    transform: scale(0.95) translateY(1rem);
  }
}
</style>
