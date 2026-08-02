<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { fetchFootnote } from '../services/api.js'

const props = defineProps({
  footnoteId: { type: Number, required: true },
  label: { type: String, default: '' }
})

const emit = defineEmits(['close', 'select'])

const store = usePlayerStore()
const panelRef = ref(null)

// Non-modal sheet: Esc closes, arrows cycle notes (and must not change verses).
// Tab is free so markers stay reachable. Capture phase + stopPropagation so global
// player shortcuts (ArrowLeft/Right for prev/next verse) do not also fire.
function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    emit('close')
    return
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    e.stopPropagation()
    if (hasMultiple.value) {
      goRelative(e.key === 'ArrowRight' ? 1 : -1)
    }
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

const activeText = computed(() => bodies.value[activeId.value] || '')

let requestId = 0
async function loadBodies() {
  const ids = verseFootnotes.value.map(f => f.id).filter(id => Number.isFinite(id))
  if (!ids.length) {
    return
  }

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
  document.addEventListener('keydown', onKeydown, true)
  requestAnimationFrame(() => {
    document.addEventListener('pointerdown', onPointerDownOutside, true)
  })
  await nextTick()
  panelRef.value?.focus?.()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  document.removeEventListener('pointerdown', onPointerDownOutside, true)
})

watch(() => props.footnoteId, loadBodies)

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
      class="fn-layer fixed inset-0 z-50 pointer-events-none"
      role="dialog"
      :aria-label="$t('panels.footnotes')"
      aria-modal="false"
    >
      <!-- Soft dim only. The whole layer is pointer-events-none so markers and the
           rest of the page stay interactive; close is handled by onPointerDownOutside. -->
      <div class="fn-backdrop absolute inset-0" aria-hidden="true"></div>

      <div
        class="fn-sheet-wrap absolute inset-x-0 bottom-0 flex justify-center px-3 pb-3 sm:px-4 sm:pb-4"
        :style="{
          paddingBottom:
            'max(0.75rem, calc(var(--controls-height, 8rem) + env(safe-area-inset-bottom, 0px) + 0.5rem))'
        }"
      >
        <div
          ref="panelRef"
          id="footnote-panel"
          class="fn-sheet pointer-events-auto w-full sm:max-w-lg max-h-[min(48vh,26rem)] flex flex-col outline-none"
          tabindex="-1"
        >
          <div class="flex justify-center pt-2 pb-0.5" aria-hidden="true">
            <div class="w-8 h-1 rounded-full bg-border"></div>
          </div>

          <header class="shrink-0 flex items-center gap-2.5 px-3.5 pb-2 pt-1">
            <span class="fn-badge shrink-0" aria-hidden="true">{{ activeLabel }}</span>

            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-body truncate">
                {{ $t('verse.footnoteTitle', { n: activeLabel }) }}
              </p>
              <p class="text-xs text-muted truncate">
                <template v-if="hasMultiple">
                  {{ verseRef }} ·
                  {{ $t('panels.footnoteOf', { current: activeIndex + 1, total: noteCount }) }}
                </template>
                <template v-else>{{ verseRef }}</template>
              </p>
            </div>

            <div class="flex items-center shrink-0">
              <template v-if="hasMultiple">
                <button
                  type="button"
                  class="fn-icon-btn"
                  :aria-label="$t('panels.prevFootnote')"
                  @click="goRelative(-1)"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="fn-icon-btn"
                  :aria-label="$t('panels.nextFootnote')"
                  @click="goRelative(1)"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
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
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  />
                </svg>
              </button>
            </div>
          </header>

          <!-- Jump chips when a verse has several notes -->
          <div
            v-if="hasMultiple"
            class="fn-chips shrink-0 flex flex-wrap gap-1.5 px-3.5 pb-2.5"
            role="tablist"
            :aria-label="$t('panels.footnoteList')"
          >
            <button
              v-for="fn in verseFootnotes"
              :key="fn.id"
              type="button"
              role="tab"
              class="fn-chip"
              :class="{ 'fn-chip-active': fn.id === activeId }"
              :aria-selected="fn.id === activeId"
              :aria-label="$t('verse.selectFootnote', { n: fn.label })"
              @click="selectNote(fn)"
            >
              {{ fn.label }}
            </button>
          </div>

          <div class="fn-divider mx-3.5" aria-hidden="true"></div>

          <div class="flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 min-h-0">
            <div
              v-if="loading && !activeText"
              class="py-3 space-y-2"
              role="status"
              :aria-label="$t('verse.loadingFootnote')"
            >
              <div class="fn-skeleton h-3 w-full rounded"></div>
              <div class="fn-skeleton h-3 w-[90%] rounded"></div>
              <div class="fn-skeleton h-3 w-[72%] rounded"></div>
              <p class="sr-only">{{ $t('verse.loadingFootnote') }}</p>
            </div>

            <div v-else-if="error && !activeText" class="text-center py-4">
              <p class="text-sm text-muted mb-3">{{ $t('verse.footnoteError') }}</p>
              <button
                type="button"
                class="bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-lg text-sm cursor-pointer transition-colors"
                @click="loadBodies"
              >
                {{ $t('verse.retry') }}
              </button>
            </div>

            <p
              v-else
              class="fn-body text-body leading-relaxed whitespace-pre-wrap"
              :key="activeId"
            >
              {{ activeText }}
            </p>
          </div>

          <p class="fn-hint shrink-0 px-3.5 pb-2.5 text-[0.65rem] text-muted/70 text-center">
            {{ $t('panels.dismissHint') }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Black scrim (same idea as tafsir/settings overlays). Using --color-body washed
   the screen pale in dark themes because body text is light there. */
.fn-backdrop {
  background: color-mix(in srgb, #000 40%, transparent);
  backdrop-filter: blur(2px);
}

.fn-sheet {
  background: var(--color-card);
  border-radius: 1rem;
  border: 1px solid var(--color-border);
  box-shadow:
    0 -2px 16px color-mix(in srgb, var(--color-body) 6%, transparent),
    0 8px 28px color-mix(in srgb, var(--color-body) 10%, transparent);
}

.fn-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 1.6rem;
  min-width: 1.6rem;
  padding: 0 0.2rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  background: var(--color-primary);
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

.fn-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 0.45rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.15s var(--ease-out, ease),
    color 0.15s var(--ease-out, ease),
    border-color 0.15s var(--ease-out, ease);
}
.fn-chip:hover {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  color: var(--color-primary);
}
.fn-chip-active {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.fn-chip:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.fn-divider {
  height: 1px;
  background: var(--color-border);
}

.fn-body {
  font-size: 0.9375rem;
  line-height: 1.65;
}

.fn-hint {
  line-height: 1.35;
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
.fn-sheet-enter-active .fn-backdrop {
  transition: opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.fn-sheet-leave-active .fn-backdrop {
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
.fn-sheet-enter-from .fn-backdrop,
.fn-sheet-leave-to .fn-backdrop {
  opacity: 0;
}
.fn-sheet-enter-from .fn-sheet,
.fn-sheet-leave-to .fn-sheet {
  transform: translateY(0.75rem);
}

@media (prefers-reduced-motion: reduce) {
  .fn-sheet-enter-active,
  .fn-sheet-leave-active,
  .fn-sheet-enter-active .fn-backdrop,
  .fn-sheet-leave-active .fn-backdrop,
  .fn-sheet-enter-active .fn-sheet,
  .fn-sheet-leave-active .fn-sheet {
    transition: none;
  }
  .fn-skeleton {
    animation: none;
  }
  .fn-backdrop {
    backdrop-filter: none;
  }
}
</style>
