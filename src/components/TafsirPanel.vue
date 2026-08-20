<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useFocusTrap } from '../composables/useFocusTrap.js'
import { fetchTafsir } from '../services/api.js'
import { sanitizeHtml } from '../utils/html.js'
import TAFSIRS from '../data/tafsirs.js'

const store = usePlayerStore()
const emit = defineEmits(['close'])
const panelRef = ref(null)

useFocusTrap(panelRef, { onEscape: () => emit('close') })

const loading = ref(false)
const error = ref(false)
const html = ref('')

const surahName = computed(() => store.currentSurah?.englishName || '')
const verseNumber = computed(() => store.currentVerse?.number || 1)

let requestId = 0
async function load() {
  const surah = store.currentSurahNum
  const ayah = verseNumber.value
  const source = store.tafsirSource
  const id = ++requestId
  loading.value = true
  error.value = false
  try {
    const data = await fetchTafsir(source, surah, ayah)
    if (id !== requestId) {
      return
    }
    html.value = sanitizeHtml(data.text)
  } catch {
    if (id !== requestId) {
      return
    }
    error.value = true
  } finally {
    if (id === requestId) {
      loading.value = false
    }
  }
}

onMounted(load)
watch(() => [store.tafsirSource, store.currentVerseIndex, store.currentSurahNum], load)
</script>

<template>
  <Transition name="tafsir" appear>
    <div
      class="fixed top-0 right-0 bottom-0 left-0 z-50 flex justify-end"
      role="dialog"
      :aria-label="$t('panels.tafsir')"
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
              <h3 class="text-sm font-semibold text-body truncate">{{ $t('panels.tafsir') }}</h3>
              <p class="text-xs text-muted truncate">{{ surahName }} {{ verseNumber }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <select
                class="text-xs bg-surface border border-border rounded-lg px-2 py-1.5 text-body cursor-pointer max-w-[10rem] truncate focus:outline-none focus:border-primary"
                :value="store.tafsirSource"
                :aria-label="$t('panels.tafsirSource')"
                @change="store.setTafsirSource(Number($event.target.value))"
              >
                <option v-for="t in TAFSIRS" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <button
                class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface transition-colors text-muted cursor-pointer"
                :aria-label="$t('panels.closeTafsir')"
                @click="emit('close')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-4 py-4">
            <p v-if="loading" class="text-sm text-muted text-center py-8">
              {{ $t('panels.loadingTafsir') }}
            </p>
            <div v-else-if="error" class="text-center py-8">
              <p class="text-sm text-muted mb-3">{{ $t('panels.tafsirError') }}</p>
              <button
                class="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-lg text-sm cursor-pointer transition-colors"
                @click="load"
              >
                {{ $t('verse.retry') }}
              </button>
            </div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              v-else
              class="tafsir-body text-sm text-body leading-relaxed text-start"
              dir="auto"
              v-html="html"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.tafsir-body :deep(h1),
.tafsir-body :deep(h2),
.tafsir-body :deep(h3) {
  font-weight: 600;
  color: var(--color-body);
  margin: 0.75rem 0 0.4rem;
  line-height: 1.4;
}
.tafsir-body :deep(h1) {
  font-size: 1.05rem;
}
.tafsir-body :deep(h2) {
  font-size: 0.95rem;
}
.tafsir-body :deep(p) {
  margin: 0.5rem 0;
}
.tafsir-body :deep(b),
.tafsir-body :deep(strong) {
  color: var(--color-body);
  font-weight: 600;
}
.tafsir-body :deep([lang='ar']),
.tafsir-body :deep(.arabic) {
  font-family: var(--font-arabic, 'Amiri', serif);
  font-size: 1.15em;
}

.tafsir-enter-active {
  transition: opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.tafsir-leave-active {
  transition: opacity 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.tafsir-enter-active > :last-child {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.tafsir-leave-active > :last-child {
  transition: transform 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.tafsir-enter-from,
.tafsir-leave-to {
  opacity: 0;
}
.tafsir-enter-from > :last-child,
.tafsir-leave-to > :last-child {
  transform: translateX(100%);
}
</style>
