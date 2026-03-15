<script setup>
import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: [String, Number],
  options: { type: Array, required: true },
  valueKey: { type: String, default: 'value' },
  labelKey: { type: String, default: 'label' },
  placeholder: { type: String, default: 'Search...' },
  compact: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const query = ref('')
const inputRef = ref(null)
const highlightedIndex = ref(-1)

const selectedLabel = computed(() => {
  const opt = props.options.find(o => o[props.valueKey] === props.modelValue)
  return opt ? opt[props.labelKey] : ''
})

function fuzzyMatch(text, q) {
  const lower = text.toLowerCase()
  const terms = q.toLowerCase().split(/\s+/)
  return terms.every(term => lower.includes(term))
}

const filtered = computed(() => {
  if (!query.value.trim()) return props.options
  return props.options.filter(o => fuzzyMatch(o[props.labelKey], query.value))
})

// Reset highlighted index when filtered results change
watch(filtered, () => { highlightedIndex.value = -1 })

function open() {
  isOpen.value = true
  query.value = ''
  highlightedIndex.value = -1
  nextTick(() => {
    if (inputRef.value) inputRef.value.focus()
  })
}

function select(opt) {
  emit('update:modelValue', opt[props.valueKey])
  isOpen.value = false
}

function scrollHighlightedIntoView() {
  nextTick(() => {
    const el = document.querySelector('.option-highlighted')
    if (el) el.scrollIntoView({ block: 'nearest' })
  })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    isOpen.value = false
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

watch(isOpen, (val) => {
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
    @click="open"
  >
    <span class="truncate">{{ selectedLabel }}</span>
    <svg class="shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
  </button>

  <Teleport to="body">
    <Transition name="picker">
      <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
        <div class="absolute inset-0 bg-black/40" @click="isOpen = false"></div>

        <div class="relative bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
          <div class="px-4 pt-4 pb-2">
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              :placeholder="placeholder"
              class="search-input"
            />
          </div>

          <div class="flex-1 overflow-y-auto px-2 pb-3">
            <button
              v-for="(opt, i) in filtered"
              :key="opt[valueKey]"
              type="button"
              class="option-item"
              :class="{ 'option-active': opt[valueKey] === modelValue, 'option-highlighted': i === highlightedIndex }"
              @click="select(opt)"
              @mouseenter="highlightedIndex = i"
            >
              <span>{{ opt[labelKey] }}</span>
              <svg v-if="opt[valueKey] === modelValue" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="shrink-0 text-primary">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </button>
            <p v-if="filtered.length === 0" class="text-center text-sm text-muted py-6">No results found</p>
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

.picker-enter-active,
.picker-leave-active {
  transition: opacity 0.2s ease;
}
.picker-enter-active > :last-child,
.picker-leave-active > :last-child {
  transition: transform 0.25s ease;
}
.picker-enter-from,
.picker-leave-to {
  opacity: 0;
}
.picker-enter-from > :last-child {
  transform: translateY(100%);
}
.picker-leave-to > :last-child {
  transform: translateY(100%);
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
