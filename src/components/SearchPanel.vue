<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useFocusTrap } from '../composables/useFocusTrap.js'
import SURAHS from '../data/surahs.js'

const store = usePlayerStore()
const emit = defineEmits(['close', 'select-surah', 'select-verse'])
const panelRef = ref(null)
const query = ref('')

useFocusTrap(panelRef, { onEscape: () => emit('close') })

const normalized = computed(() => query.value.trim().toLowerCase())

// Match surahs by number, English name, translation, or Arabic name.
const matchedSurahs = computed(() => {
  const q = normalized.value
  if (!q) {
    return []
  }
  return SURAHS.filter(s => {
    return (
      String(s.number) === q ||
      s.englishName.toLowerCase().includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q) ||
      s.name.includes(query.value.trim())
    )
  }).slice(0, 8)
})

// Recently opened surahs, shown when the query is empty.
const recentSurahs = computed(() => {
  return store.recentSurahs
    .map(num => SURAHS.find(s => s.number === num))
    .filter(Boolean)
    .slice(0, 8)
})

// Match verses within the currently loaded surah by translation text.
const matchedVerses = computed(() => {
  const q = normalized.value
  if (!q || q.length < 2) {
    return []
  }
  const results = []
  for (let i = 0; i < store.translationVerses.length; i++) {
    const t = store.translationVerses[i]
    if (t?.text && t.text.toLowerCase().includes(q)) {
      results.push({ index: i, number: store.verses[i]?.number ?? i + 1, text: t.text })
      if (results.length >= 12) {
        break
      }
    }
  }
  return results
})

function pickSurah(num) {
  emit('select-surah', num)
  emit('close')
}

function pickVerse(index) {
  emit('select-verse', index)
  emit('close')
}
</script>

<template>
  <Transition name="search" appear>
    <div
      class="fixed top-0 right-0 bottom-0 left-0 z-50 flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-label="Search"
      aria-modal="true"
    >
      <div
        class="absolute top-0 right-0 bottom-0 left-0 bg-black/40 backdrop-blur-sm"
        role="presentation"
        @click="emit('close')"
      ></div>

      <div
        ref="panelRef"
        class="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div class="flex items-center gap-2 px-4 border-b border-border">
          <svg
            class="shrink-0 text-muted"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1114 9.5 4.49 4.49 0 019.5 14z"
            />
          </svg>
          <input
            v-model="query"
            type="text"
            class="flex-1 bg-transparent py-3.5 text-sm text-body focus:outline-none"
            :placeholder="$t('panels.searchPlaceholder')"
            :aria-label="$t('panels.searchQuery')"
          />
          <button
            class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface text-muted cursor-pointer"
            :aria-label="$t('panels.closeSearch')"
            @click="emit('close')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>

        <div class="max-h-[60vh] overflow-y-auto">
          <p
            v-if="normalized && !matchedSurahs.length && !matchedVerses.length"
            class="px-4 py-6 text-sm text-muted text-center"
          >
            {{ $t('panels.noMatches') }}
          </p>

          <div v-if="!normalized && recentSurahs.length">
            <p
              class="px-4 pt-3 pb-1 text-[0.7rem] font-semibold text-muted uppercase tracking-wide"
            >
              {{ $t('panels.recent') }}
            </p>
            <button
              v-for="s in recentSurahs"
              :key="s.number"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface cursor-pointer transition-colors"
              @click="pickSurah(s.number)"
            >
              <span
                class="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center"
                >{{ s.number }}</span
              >
              <span class="min-w-0">
                <span class="block text-sm text-body truncate">{{ s.englishName }}</span>
                <span class="block text-xs text-muted truncate">{{
                  s.englishNameTranslation
                }}</span>
              </span>
            </button>
          </div>

          <div v-if="matchedSurahs.length">
            <p
              class="px-4 pt-3 pb-1 text-[0.7rem] font-semibold text-muted uppercase tracking-wide"
            >
              {{ $t('panels.surahs') }}
            </p>
            <button
              v-for="s in matchedSurahs"
              :key="s.number"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface cursor-pointer transition-colors"
              @click="pickSurah(s.number)"
            >
              <span
                class="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center"
                >{{ s.number }}</span
              >
              <span class="min-w-0">
                <span class="block text-sm text-body truncate">{{ s.englishName }}</span>
                <span class="block text-xs text-muted truncate">{{
                  s.englishNameTranslation
                }}</span>
              </span>
            </button>
          </div>

          <div v-if="matchedVerses.length">
            <p
              class="px-4 pt-3 pb-1 text-[0.7rem] font-semibold text-muted uppercase tracking-wide"
            >
              {{ $t('panels.versesIn', { surah: store.currentSurah?.englishName }) }}
            </p>
            <button
              v-for="v in matchedVerses"
              :key="v.index"
              class="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-surface cursor-pointer transition-colors"
              @click="pickVerse(v.index)"
            >
              <span
                class="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center"
                >{{ v.number }}</span
              >
              <span class="min-w-0 text-sm text-body line-clamp-2">{{ v.text }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.search-enter-active {
  transition: opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.search-leave-active {
  transition: opacity 0.15s cubic-bezier(0.25, 1, 0.5, 1);
}
.search-enter-active > :last-child {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.search-enter-from,
.search-leave-to {
  opacity: 0;
}
.search-enter-from > :last-child {
  transform: translateY(-1rem);
}
</style>
