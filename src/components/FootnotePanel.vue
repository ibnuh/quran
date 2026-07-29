<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { fetchFootnote } from '../services/api.js'

const props = defineProps({
  // Footnote currently focused in the panel (the one the user clicked).
  footnoteId: { type: Number, required: true },
  label: { type: String, default: '' }
})

const emit = defineEmits(['close', 'select'])

const store = usePlayerStore()
const panelRef = ref(null)
const listRef = ref(null)

// Non-modal sheet: Esc closes, but Tab is free so markers stay reachable.
function onKeydown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
  }
}

const loading = ref(false)
const error = ref(false)
// Map of footnote id → body text for the current verse.
const bodies = ref({})

const surahName = computed(() => store.currentSurah?.englishName || '')
const verseNumber = computed(() => store.currentVerse?.number || 1)
const verseRef = computed(() => {
  if (!surahName.value) {
    return String(verseNumber.value)
  }
  return `${surahName.value} ${verseNumber.value}`
})

const verseFootnotes = computed(() => {
  const list = store.currentTranslationVerse?.footnotes
  if (Array.isArray(list) && list.length) {
    return list
  }
  // Fallback when the verse list is not yet available.
  return [{ id: props.footnoteId, label: props.label || '1' }]
})

const activeId = computed(() => props.footnoteId)
const activeIndex = computed(() => {
  const idx = verseFootnotes.value.findIndex(f => f.id === activeId.value)
  return idx >= 0 ? idx : 0
})
const noteCount = computed(() => verseFootnotes.value.length)
const hasMultiple = computed(() => noteCount.value > 1)

const activeLabel = computed(() => {
  const match = verseFootnotes.value.find(f => f.id === activeId.value)
  return match?.label || props.label || String(activeIndex.value + 1)
})

let requestId = 0
async function loadBodies() {
  const ids = verseFootnotes.value.map(f => f.id).filter(id => Number.isFinite(id))
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

function goRelative(delta) {
  const list = verseFootnotes.value
  if (list.length < 2) {
    return
  }
  const next = (activeIndex.value + delta + list.length) % list.length
  selectNote(list[next])
}

async function scrollActiveIntoView() {
  await nextTick()
  const root = listRef.value
  if (!root) {
    return
  }
  const active = root.querySelector('[data-fn-active="true"]')
  if (active && typeof active.scrollIntoView === 'function') {
    active.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
}

// Close when clicking outside the sheet, but ignore footnote markers so the
// parent can toggle/switch notes without a race against this handler.
function onPointerDownOutside(e) {
  const panel = panelRef.value
  if (!panel) {
    return
  }
  const target = e.target
  if (!(target instanceof Node)) {
    return
  }
  if (panel.contains(target)) {
    return
  }
  if (target instanceof Element && target.closest('.fn-marker')) {
    return
  }
  emit('close')
}

onMounted(async () => {
  loadBodies()
  scrollActiveIntoView()
  document.addEventListener('keydown', onKeydown, true)
  // Defer so the opening click on the marker does not immediately close the sheet.
  requestAnimationFrame(() => {
    document.addEventListener('pointerdown', onPointerDownOutside, true)
  })
  // Move focus into the sheet for screen readers without trapping Tab.
  await nextTick()
  panelRef.value?.focus?.()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  document.removeEventListener('pointerdown', onPointerDownOutside, true)
})

// Reload when the focused note changes (bodies for the verse are reused).
watch(() => props.footnoteId, () => {
  loadBodies()
  scrollActiveIntoView()
})

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
  <Transition name="fn-sheet" appear>
    <div
      class="fn-layer fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none px-3 pb-3 sm:px-4 sm:pb-4"
      style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px))"
      role="dialog"
      :aria-label="$t('panels.footnotes')"
      aria-modal="false"
    >
      <div
        ref="panelRef"
        id="footnote-panel"
        class="fn-sheet pointer-events-auto w-full sm:max-w-lg max-h-[min(55vh,28rem)] flex flex-col shadow-2xl outline-none"
        tabindex="-1"
      >
        <!-- Grab affordance -->
        <div class="flex justify-center pt-2.5 pb-1" aria-hidden="true">
          <div class="w-10 h-1 rounded-full bg-border"></div>
        </div>

        <header class="shrink-0 flex items-start justify-between gap-3 px-4 pb-2.5">
          <div class="min-w-0 flex items-start gap-3">
            <span class="fn-badge shrink-0 mt-0.5" aria-hidden="true">
              {{ activeLabel }}
            </span>
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-body leading-snug">
                {{ $t('verse.footnoteTitle', { n: activeLabel }) }}
              </h3>
              <p class="text-xs text-muted mt-0.5 truncate">
                <span>{{ verseRef }}</span>
                <template v-if="hasMultiple">
                  <span class="mx-1.5 text-border" aria-hidden="true">·</span>
                  <span>{{
                    $t('panels.footnoteOf', { current: activeIndex + 1, total: noteCount })
                  }}</span>
                </template>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-0.5 shrink-0">
            <template v-if="hasMultiple">
              <button
                type="button"
                class="fn-icon-btn"
                :aria-label="$t('panels.prevFootnote')"
                @click="goRelative(-1)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>
              <button
                type="button"
                class="fn-icon-btn"
                :aria-label="$t('panels.nextFootnote')"
                @click="goRelative(1)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
                </svg>
              </button>
            </template>
            <button
              type="button"
              class="fn-icon-btn"
              :aria-label="$t('verse.closeFootnote')"
              @click="emit('close')"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                />
              </svg>
            </button>
          </div>
        </header>

        <!-- Quick jump pills when the verse has more than one note -->
        <div
          v-if="hasMultiple"
          class="shrink-0 flex flex-wrap gap-1.5 px-4 pb-2.5"
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

        <div class="fn-divider mx-4" aria-hidden="true"></div>

        <div ref="listRef" class="flex-1 overflow-y-auto overscroll-contain px-4 py-3.5 min-h-0">
          <div
            v-if="loading && !bodies[activeId]"
            class="py-5 space-y-2.5"
            role="status"
            :aria-label="$t('verse.loadingFootnote')"
          >
            <div class="fn-skeleton h-3 w-full rounded"></div>
            <div class="fn-skeleton h-3 w-[92%] rounded"></div>
            <div class="fn-skeleton h-3 w-[78%] rounded"></div>
            <p class="sr-only">{{ $t('verse.loadingFootnote') }}</p>
          </div>

          <div v-else-if="error && !bodies[activeId]" class="text-center py-5 px-2">
            <div
              class="mx-auto mb-3 w-10 h-10 rounded-full bg-surface flex items-center justify-center text-muted"
              aria-hidden="true"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                />
              </svg>
            </div>
            <p class="text-sm text-muted mb-3">{{ $t('verse.footnoteError') }}</p>
            <button
              type="button"
              class="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-lg text-sm cursor-pointer transition-colors"
              @click="loadBodies"
            >
              {{ $t('verse.retry') }}
            </button>
          </div>

          <!-- Multi-note: stacked cards so the whole verse's notes are scannable -->
          <div v-else-if="hasMultiple" class="space-y-2">
            <article
              v-for="fn in verseFootnotes"
              :key="fn.id"
              class="fn-card"
              :class="{ 'fn-card-active': fn.id === activeId }"
              :data-fn-active="fn.id === activeId ? 'true' : undefined"
              :aria-current="fn.id === activeId ? 'true' : undefined"
            >
              <button
                type="button"
                class="fn-card-head"
                :aria-label="$t('verse.selectFootnote', { n: fn.label })"
                :aria-expanded="fn.id === activeId"
                @click="selectNote(fn)"
              >
                <span class="fn-card-num" aria-hidden="true">{{ fn.label }}</span>
                <span class="text-xs font-medium text-muted">
                  {{ $t('verse.footnoteTitle', { n: fn.label }) }}
                </span>
              </button>
              <div v-if="fn.id === activeId || bodies[fn.id]" class="fn-card-body">
                <p
                  v-if="bodies[fn.id]"
                  class="text-sm sm:text-[0.95rem] text-body leading-relaxed whitespace-pre-wrap"
                >
                  {{ bodies[fn.id] }}
                </p>
                <p v-else-if="fn.id === activeId && loading" class="text-sm text-muted">
                  {{ $t('verse.loadingFootnote') }}
                </p>
              </div>
            </article>
          </div>

          <!-- Single note: clean reading body -->
          <p
            v-else
            class="text-sm sm:text-[0.95rem] text-body leading-relaxed whitespace-pre-wrap"
          >
            {{ bodies[activeId] }}
          </p>
        </div>

        <div class="shrink-0 px-4 pb-3 pt-0.5 text-center">
          <p class="text-[0.7rem] text-muted/70">{{ $t('panels.dismissHint') }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fn-sheet {
  background: var(--color-card);
  border-radius: 1.1rem;
  border: 1px solid var(--color-border);
  box-shadow:
    0 -4px 24px color-mix(in srgb, var(--color-body) 8%, transparent),
    0 12px 40px color-mix(in srgb, var(--color-body) 12%, transparent);
}

.fn-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 0.45rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 700;
  color: white;
  background: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.fn-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    background 0.15s var(--ease-out, ease),
    color 0.15s var(--ease-out, ease);
}
.fn-icon-btn:hover {
  background: var(--color-surface);
  color: var(--color-body);
}
.fn-icon-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

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
    background 0.15s var(--ease-out, ease),
    color 0.15s var(--ease-out, ease),
    border-color 0.15s var(--ease-out, ease),
    box-shadow 0.15s var(--ease-out, ease);
}
.fn-tab:hover {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  color: var(--color-body);
}
.fn-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.fn-tab-active {
  color: white;
  background: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.fn-divider {
  height: 1px;
  background: var(--color-border);
}

.fn-card {
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: var(--color-surface);
  overflow: hidden;
  transition:
    border-color 0.15s var(--ease-out, ease),
    box-shadow 0.15s var(--ease-out, ease),
    background 0.15s var(--ease-out, ease);
}
.fn-card-active {
  border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-card));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 12%, transparent);
}
.fn-card-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  text-align: start;
  cursor: pointer;
  background: transparent;
  border: none;
  color: inherit;
}
.fn-card-head:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
.fn-card-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.4rem;
  padding: 0 0.3rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}
.fn-card-active .fn-card-num {
  color: white;
  background: var(--color-primary);
}
.fn-card-body {
  padding: 0 0.85rem 0.8rem;
}

.fn-skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface) 0%,
    color-mix(in srgb, var(--color-border) 70%, var(--color-surface)) 50%,
    var(--color-surface) 100%
  );
  background-size: 200% 100%;
  animation: fn-shimmer 1.2s ease-in-out infinite;
}
@keyframes fn-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.fn-sheet-enter-active {
  transition: opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.fn-sheet-leave-active {
  transition: opacity 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.fn-sheet-enter-active .fn-sheet {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.fn-sheet-leave-active .fn-sheet {
  transition: transform 0.18s cubic-bezier(0.25, 1, 0.5, 1);
}
.fn-sheet-enter-from,
.fn-sheet-leave-to {
  opacity: 0;
}
.fn-sheet-enter-from .fn-sheet,
.fn-sheet-leave-to .fn-sheet {
  transform: translateY(1rem);
}

@media (prefers-reduced-motion: reduce) {
  .fn-sheet-enter-active,
  .fn-sheet-leave-active,
  .fn-sheet-enter-active .fn-sheet,
  .fn-sheet-leave-active .fn-sheet {
    transition: none;
  }
  .fn-skeleton {
    animation: none;
  }
}
</style>
