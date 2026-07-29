<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useFocusTrap } from '../composables/useFocusTrap.js'
import { fetchFootnote } from '../services/api.js'

const props = defineProps({
  // Footnote currently focused in the panel (the one the user clicked).
  footnoteId: { type: Number, required: true },
  label: { type: String, default: '' }
})

const emit = defineEmits(['close', 'select'])

const store = usePlayerStore()
const panelRef = ref(null)

useFocusTrap(panelRef, { onEscape: () => emit('close') })

const loading = ref(false)
const error = ref(false)
// Map of footnote id → body text for the current verse.
const bodies = ref({})

const surahName = computed(() => store.currentSurah?.englishName || '')
const verseNumber = computed(() => store.currentVerse?.number || 1)

const verseFootnotes = computed(() => {
  const list = store.currentTranslationVerse?.footnotes
  return Array.isArray(list) ? list : []
})

const activeId = computed(() => props.footnoteId)
const activeLabel = computed(() => {
  const match = verseFootnotes.value.find(f => f.id === activeId.value)
  return match?.label || props.label || String(activeId.value)
})
const activeText = computed(() => bodies.value[activeId.value] || '')

let requestId = 0
async function loadBodies() {
  const list = verseFootnotes.value.length
    ? verseFootnotes.value
    : [{ id: props.footnoteId, label: props.label }]
  const ids = list.map(f => f.id).filter(id => Number.isFinite(id))
  if (!ids.length) {
    return
  }

  // Only show the loading spinner when the active note is not cached yet.
  const needActive = !bodies.value[props.footnoteId]
  const req = ++requestId
  if (needActive) {
    loading.value = true
    error.value = false
  }

  try {
    const results = await Promise.all(
      ids.map(async id => {
        if (bodies.value[id]) {
          return { id, text: bodies.value[id] }
        }
        try {
          const data = await fetchFootnote(id)
          return { id, text: data.text }
        } catch {
          return { id, text: null, failed: true }
        }
      })
    )
    if (req !== requestId) {
      return
    }
    const next = { ...bodies.value }
    let activeFailed = false
    for (const r of results) {
      if (r.text != null) {
        next[r.id] = r.text
      } else if (r.failed && r.id === props.footnoteId) {
        activeFailed = true
      }
    }
    bodies.value = next
    error.value = activeFailed && !next[props.footnoteId]
  } catch {
    if (req !== requestId) {
      return
    }
    if (!bodies.value[props.footnoteId]) {
      error.value = true
    }
  } finally {
    if (req === requestId) {
      loading.value = false
    }
  }
}

function selectNote(fn) {
  if (fn.id === props.footnoteId) {
    return
  }
  emit('select', { id: fn.id, label: fn.label })
}

onMounted(loadBodies)

// Reload when the focused note changes (bodies for the verse are reused).
watch(() => props.footnoteId, loadBodies)

// Clear and reload when the verse or translation changes.
watch(
  () => [store.currentVerseIndex, store.currentSurahNum, store.currentTranslation],
  () => {
    bodies.value = {}
    loadBodies()
  }
)
</script>

<template>
  <Transition name="footnote-panel" appear>
    <div
      class="fixed top-0 right-0 bottom-0 left-0 z-50 flex justify-end"
      role="dialog"
      :aria-label="$t('panels.footnotes')"
      aria-modal="true"
    >
      <div
        class="absolute top-0 right-0 bottom-0 left-0 bg-black/40"
        role="presentation"
        @click="emit('close')"
      ></div>

      <div ref="panelRef" class="relative w-full sm:max-w-md lg:max-w-lg h-full shadow-2xl">
        <div class="bg-card h-full flex flex-col">
          <div
            class="shrink-0 flex items-center justify-between gap-3 px-4 pb-3 border-b border-border"
            style="padding-top: max(0.75rem, env(safe-area-inset-top, 0px))"
          >
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-body truncate">{{ $t('panels.footnotes') }}</h3>
              <p class="text-xs text-muted truncate">{{ surahName }} {{ verseNumber }}</p>
            </div>
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

          <!-- Switcher when the verse has more than one note -->
          <div
            v-if="verseFootnotes.length > 1"
            class="shrink-0 flex flex-wrap gap-1.5 px-4 py-3 border-b border-border"
            role="tablist"
            :aria-label="$t('panels.footnoteList')"
          >
            <button
              v-for="fn in verseFootnotes"
              :key="fn.id"
              type="button"
              role="tab"
              class="fn-tab"
              :class="{ 'fn-tab-active': fn.id === activeId }"
              :aria-selected="fn.id === activeId"
              :aria-label="$t('verse.footnoteN', { n: fn.label })"
              @click="selectNote(fn)"
            >
              {{ fn.label }}
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-4 py-4">
            <div class="flex items-baseline gap-2 mb-3">
              <span
                class="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold"
              >
                {{ activeLabel }}
              </span>
              <p class="text-xs font-medium text-muted uppercase tracking-wide">
                {{ $t('verse.footnoteTitle', { n: activeLabel }) }}
              </p>
            </div>

            <p v-if="loading && !activeText" class="text-sm text-muted text-center py-8">
              {{ $t('verse.loadingFootnote') }}
            </p>
            <div v-else-if="error && !activeText" class="text-center py-8">
              <p class="text-sm text-muted mb-3">{{ $t('verse.footnoteError') }}</p>
              <button
                type="button"
                class="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-lg text-sm cursor-pointer transition-colors"
                @click="loadBodies"
              >
                {{ $t('verse.retry') }}
              </button>
            </div>
            <p v-else class="text-sm sm:text-[0.95rem] text-body leading-relaxed whitespace-pre-wrap">
              {{ activeText }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fn-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.55rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition:
    background 0.15s var(--ease-out),
    color 0.15s var(--ease-out),
    border-color 0.15s var(--ease-out);
}
.fn-tab:hover {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  color: var(--color-body);
}
.fn-tab-active {
  color: white;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.footnote-panel-enter-active {
  transition: opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.footnote-panel-leave-active {
  transition: opacity 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.footnote-panel-enter-active > :last-child {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.footnote-panel-leave-active > :last-child {
  transition: transform 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.footnote-panel-enter-from,
.footnote-panel-leave-to {
  opacity: 0;
}
.footnote-panel-enter-from > :last-child,
.footnote-panel-leave-to > :last-child {
  transform: translateX(100%);
}
</style>
