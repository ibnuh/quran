<script setup>
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useFocusTrap } from '../composables/useFocusTrap.js'
import { normalizeArabicForSearch } from '../utils/arabicText.js'
import SURAHS from '../data/surahs.js'

const store = usePlayerStore()
const emit = defineEmits(['close', 'select-surah', 'select-verse'])
const panelRef = ref(null)
const query = ref('')

useFocusTrap(panelRef, { onEscape: () => emit('close') })

const normalized = computed(() => query.value.trim().toLowerCase())

// The stored surah names are fully vocalized Uthmani text; fold them once so
// plain unvocalized queries (e.g. "الفاتحة") can match.
const SURAH_NAMES_FOLDED = SURAHS.map(s => normalizeArabicForSearch(s.name))

const foldedQuery = computed(() => normalizeArabicForSearch(query.value))
const hasArabicQuery = computed(() => /[\u0600-\u06FF]/.test(query.value))

// Match surahs by number (Western or Arabic-Indic digits), English name,
// translation, or Arabic name (diacritic-insensitive).
const matchedSurahs = computed(() => {
  const q = normalized.value
  if (!q) {
    return []
  }
  const fq = foldedQuery.value
  return SURAHS.filter((s, i) => {
    return (
      String(s.number) === q ||
      (fq && String(s.number) === fq) ||
      s.englishName.toLowerCase().includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q) ||
      (hasArabicQuery.value && fq && SURAH_NAMES_FOLDED[i].includes(fq))
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

// First-open suggestions when there is no recent history yet.
const SUGGESTED_SURAH_NUMS = [1, 2, 18, 36, 55, 67, 112, 113, 114]
const suggestedSurahs = computed(() => {
  if (normalized.value || recentSurahs.value.length) {
    return []
  }
  return SUGGESTED_SURAH_NUMS.map(num => SURAHS.find(s => s.number === num)).filter(Boolean)
})

// Folded Arabic verse texts, computed once per surah (only when an Arabic
// query is active) so per-keystroke matching is a plain substring test.
const foldedVerseTexts = computed(() =>
  hasArabicQuery.value ? store.verses.map(v => normalizeArabicForSearch(v.text)) : []
)

// Match verses within the currently loaded surah by translation text or by
// the Arabic verse text (diacritic-insensitive).
const matchedVerses = computed(() => {
  const q = normalized.value
  if (!q || q.length < 2) {
    return []
  }
  const fq = hasArabicQuery.value ? foldedQuery.value : ''
  const arabicTexts = foldedVerseTexts.value
  const results = []
  for (let i = 0; i < store.verses.length; i++) {
    const t = store.translationVerses[i]
    const translationMatch = t?.text && t.text.toLowerCase().includes(q)
    const arabicMatch = fq.length >= 2 && arabicTexts[i]?.includes(fq)
    if (translationMatch || arabicMatch) {
      results.push({
        index: i,
        number: store.verses[i]?.number ?? i + 1,
        text: t?.text || store.verses[i]?.text || ''
      })
      if (results.length >= 12) {
        break
      }
    }
  }
  return results
})

const showEmptyResults = computed(
  () => !!normalized.value && !matchedSurahs.value.length && !matchedVerses.value.length
)

function pickSurah(num) {
  emit('select-surah', num)
  emit('close')
}

function pickVerse(index) {
  emit('select-verse', index)
  emit('close')
}

function clearQuery() {
  query.value = ''
}
</script>

<template>
  <Transition name="search" appear>
    <div
      class="fixed top-0 right-0 bottom-0 left-0 z-50 flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      :aria-label="$t('header.search')"
      aria-modal="true"
    >
      <div
        class="absolute top-0 right-0 bottom-0 left-0 bg-black/40 backdrop-blur-sm"
        role="presentation"
        @click="emit('close')"
      ></div>

      <div
        ref="panelRef"
        class="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-border"
      >
        <div class="flex items-center gap-2 px-4 border-b border-border">
          <svg
            class="shrink-0 text-muted"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1114 9.5 4.49 4.49 0 019.5 14z"
            />
          </svg>
          <input
            v-model="query"
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            class="flex-1 bg-transparent py-3.5 text-sm text-body focus:outline-none min-w-0"
            :placeholder="$t('panels.searchPlaceholder')"
            :aria-label="$t('panels.searchQuery')"
          />
          <button
            v-if="query"
            type="button"
            class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface text-muted cursor-pointer"
            :aria-label="$t('panels.clearSearch')"
            @click="clearQuery"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
          <button
            type="button"
            class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface text-muted cursor-pointer"
            :aria-label="$t('panels.closeSearch')"
            @click="emit('close')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>

        <div class="max-h-[60vh] overflow-y-auto">
          <div v-if="showEmptyResults" class="px-4 py-8 text-center">
            <p class="text-sm text-body font-medium mb-1">{{ $t('panels.noMatchesTitle') }}</p>
            <p class="text-xs text-muted leading-relaxed max-w-xs mx-auto">
              {{ $t('panels.noMatches') }}
            </p>
          </div>

          <div v-if="!normalized && recentSurahs.length">
            <p
              class="px-4 pt-3 pb-1 text-[0.7rem] font-semibold text-muted uppercase tracking-wide"
            >
              {{ $t('panels.recent') }}
            </p>
            <button
              v-for="s in recentSurahs"
              :key="'r-' + s.number"
              type="button"
              class="search-row w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors"
              @click="pickSurah(s.number)"
            >
              <span
                class="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center"
                >{{ s.number }}</span
              >
              <span class="min-w-0 flex-1">
                <span class="block text-sm text-body truncate">{{ s.englishName }}</span>
                <span class="block text-xs text-muted truncate">{{
                  s.englishNameTranslation
                }}</span>
              </span>
              <span class="shrink-0 text-sm text-muted font-arabic" dir="rtl" lang="ar">{{
                s.name
              }}</span>
            </button>
          </div>

          <div v-if="suggestedSurahs.length">
            <p
              class="px-4 pt-3 pb-1 text-[0.7rem] font-semibold text-muted uppercase tracking-wide"
            >
              {{ $t('panels.suggested') }}
            </p>
            <p class="px-4 pb-1.5 text-[0.7rem] text-muted/80 leading-snug">
              {{ $t('panels.suggestedHint') }}
            </p>
            <button
              v-for="s in suggestedSurahs"
              :key="'s-' + s.number"
              type="button"
              class="search-row w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors"
              @click="pickSurah(s.number)"
            >
              <span
                class="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center"
                >{{ s.number }}</span
              >
              <span class="min-w-0 flex-1">
                <span class="block text-sm text-body truncate">{{ s.englishName }}</span>
                <span class="block text-xs text-muted truncate">{{
                  s.englishNameTranslation
                }}</span>
              </span>
              <span class="shrink-0 text-sm text-muted font-arabic" dir="rtl" lang="ar">{{
                s.name
              }}</span>
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
              :key="'m-' + s.number"
              type="button"
              class="search-row w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors"
              @click="pickSurah(s.number)"
            >
              <span
                class="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center"
                >{{ s.number }}</span
              >
              <span class="min-w-0 flex-1">
                <span class="block text-sm text-body truncate">{{ s.englishName }}</span>
                <span class="block text-xs text-muted truncate">{{
                  s.englishNameTranslation
                }}</span>
              </span>
              <span class="shrink-0 text-sm text-muted font-arabic" dir="rtl" lang="ar">{{
                s.name
              }}</span>
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
              type="button"
              class="search-row w-full flex items-start gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors"
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
.search-row:hover {
  background: var(--color-surface);
}

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
