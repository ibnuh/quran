<script setup>
import { computed, ref } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { buildVerseUrl } from '../composables/useDeepLink.js'
import VerseArabic from './VerseArabic.vue'

const emit = defineEmits(['retry', 'open-tafsir'])
const store = usePlayerStore()

const copied = ref(false)

// Per-font display metrics: the size slider multiplies the font's sizeFactor, and the
// font's lineHeight gives tall-mark scripts room so harakat never overlap.
// Justify is ignored with the mushaf (QCF) font: its glyphs are already spaced for the
// printed page, so justifying per verse produces large uneven gaps.
const justify = computed(() => store.justifyText && !store.mushafMode)
const arabicStyle = computed(() => ({
  fontFamily: store.arabicFontFamily,
  fontSize: store.arabicFontSize * store.arabicFontMetrics.sizeFactor + 'rem',
  lineHeight: store.arabicFontMetrics.lineHeight,
  overflowWrap: 'break-word',
  textAlign: justify.value ? 'justify' : 'center',
  textAlignLast: justify.value ? 'center' : 'auto'
}))

const isLastVerse = computed(
  () => store.totalVerses > 0 && store.currentVerseIndex === store.totalVerses - 1
)

function verseReference() {
  const surah = store.currentSurah
  const verse = store.currentVerse
  return `${surah.englishName} ${surah.number}:${verse.number}`
}

function canonicalUrl() {
  return `${window.location.origin}${buildVerseUrl(store.currentSurahNum, store.currentVerse.number)}`
}

function shareVerse() {
  const surah = store.currentSurah
  const verse = store.currentVerse
  const translation = store.currentTranslationVerse
  if (!surah || !verse) {
    return
  }

  const text = `${verseReference()}\n\n${verse.text}\n${translation?.text || ''}`
  const url = canonicalUrl()

  if (navigator.share) {
    navigator.share({ title: verseReference(), text, url }).catch(() => {})
  } else {
    navigator.clipboard.writeText(`${text}\n${url}`).catch(() => {})
  }
}

function copyVerse() {
  const surah = store.currentSurah
  const verse = store.currentVerse
  const translation = store.currentTranslationVerse
  if (!surah || !verse) {
    return
  }
  const text = `${verse.text}\n\n${translation?.text || ''}\n\n${verseReference()}\n${canonicalUrl()}`
  navigator.clipboard
    .writeText(text)
    .then(() => {
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 1500)
    })
    .catch(() => {})
}
</script>

<template>
  <div class="text-center w-full" :style="{ maxWidth: store.contentWidth + 'rem' }">
    <!-- Skeleton loading -->
    <div v-if="store.isLoading" class="skeleton-container" style="min-height: 40vh">
      <div class="skeleton-line h-4 w-24 rounded mx-auto mb-8"></div>
      <div class="space-y-5 mb-6" dir="rtl">
        <div
          class="skeleton-line h-12 rounded-lg w-[90%] mx-auto"
          style="animation-delay: 0.1s"
        ></div>
        <div
          class="skeleton-line h-12 rounded-lg w-[70%] mx-auto"
          style="animation-delay: 0.2s"
        ></div>
        <div
          class="skeleton-line h-12 rounded-lg w-[50%] mx-auto"
          style="animation-delay: 0.3s"
        ></div>
      </div>
      <div
        class="skeleton-line h-8 w-8 rounded-full mx-auto mb-5"
        style="animation-delay: 0.15s"
      ></div>
      <div class="space-y-2">
        <div class="skeleton-line h-4 rounded w-[80%] mx-auto" style="animation-delay: 0.25s"></div>
        <div class="skeleton-line h-4 rounded w-[60%] mx-auto" style="animation-delay: 0.35s"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="error-state text-red-500">
      <svg class="w-10 h-10 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
        />
      </svg>
      <p class="mb-3 text-sm">{{ store.error }}</p>
      <button
        class="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg text-sm cursor-pointer transition-colors"
        :aria-label="$t('verse.retryAria')"
        @click="emit('retry')"
      >
        {{ $t('verse.retry') }}
      </button>
    </div>

    <!-- Verse -->
    <div v-else-if="store.currentVerse" class="relative" style="min-height: 40vh">
      <Transition name="verse-fade">
        <div :key="store.currentSurahNum + '-' + store.currentVerseIndex">
          <div v-if="store.showBismillah" class="bismillah mb-8">
            <p
              class="text-xl sm:text-2xl text-accent"
              dir="rtl"
              lang="ar"
              :style="{ fontFamily: store.arabicFontFamily }"
            >
              {{ 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' }}
            </p>
          </div>

          <VerseArabic
            :index="store.currentVerseIndex"
            :p-style="arabicStyle"
            p-class="mb-5"
            animate
          />

          <div class="flex flex-col items-center gap-2.5 mt-4 mb-5">
            <span
              v-if="!store.verseEndOrnament"
              class="verse-badge inline-flex items-center justify-center bg-primary/10 text-primary text-xs font-bold w-8 h-8 rounded-full"
            >
              {{ store.currentVerse.number }}
            </span>

            <div
              v-if="
                store.verseActions.bookmark ||
                store.verseActions.share ||
                store.verseActions.copy ||
                store.verseActions.tafsir
              "
              class="flex items-center justify-center gap-1"
            >
              <button
                v-if="store.verseActions.tafsir"
                class="verse-action-btn"
                :aria-label="$t('verse.openTafsir')"
                :title="$t('panels.tafsir')"
                @click="emit('open-tafsir')"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="text-muted/50"
                >
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
              </button>

              <button
                v-if="store.verseActions.bookmark"
                class="verse-action-btn"
                :aria-label="
                  store.isCurrentBookmarked ? $t('verse.removeBookmark') : $t('verse.bookmark')
                "
                :title="
                  store.isCurrentBookmarked ? $t('verse.removeBookmark') : $t('verse.bookmark')
                "
                @click="store.toggleBookmark()"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  :fill="store.isCurrentBookmarked ? 'currentColor' : 'none'"
                  :class="store.isCurrentBookmarked ? 'text-accent' : 'text-muted/50'"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                </svg>
              </button>

              <button
                v-if="store.verseActions.share"
                class="verse-action-btn"
                :aria-label="$t('verse.share')"
                :title="$t('verse.share')"
                @click="shareVerse"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="text-muted/50"
                >
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                </svg>
              </button>

              <button
                v-if="store.verseActions.copy"
                class="verse-action-btn"
                :aria-label="copied ? $t('verse.copied') : $t('verse.copy')"
                :title="copied ? $t('verse.copied') : $t('verse.copy')"
                @click="copyVerse"
              >
                <svg
                  v-if="!copied"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="text-muted/50"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                <svg
                  v-else
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="text-primary"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </button>
            </div>
          </div>

          <p
            class="verse-translation leading-relaxed text-muted font-light mx-auto"
            :style="{
              fontSize: store.translationFontSize + 'rem',
              maxWidth: store.contentWidth * 0.75 + 'rem'
            }"
          >
            {{ store.currentTranslationVerse?.text }}
          </p>

          <div
            v-for="extra in store.currentExtraTranslations"
            :key="extra.name"
            class="verse-translation mx-auto mt-4"
            :style="{ maxWidth: store.contentWidth * 0.75 + 'rem' }"
          >
            <p class="text-[0.65rem] uppercase tracking-wide text-muted/60 mb-1">
              {{ extra.name }}
            </p>
            <p
              class="leading-relaxed text-muted font-light"
              :style="{ fontSize: store.translationFontSize + 'rem' }"
            >
              {{ extra.text }}
            </p>
          </div>

          <div v-if="isLastVerse" class="surah-end mt-8">
            <div class="flex items-center gap-3 justify-center">
              <div class="end-line-left h-px w-16 bg-border"></div>
              <div class="end-diamond w-1.5 h-1.5 bg-accent/60 rotate-45 rounded-[1px]"></div>
              <div class="end-line-right h-px w-16 bg-border"></div>
            </div>
            <p class="end-text text-[0.65rem] text-muted/50 mt-3">
              {{ $t('verse.endOf', { surah: store.currentSurah?.englishName }) }}
            </p>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* -- Skeleton shimmer -- */
.skeleton-container {
  animation: skeleton-container-in 0.4s cubic-bezier(0.25, 1, 0.5, 1) both;
}
@keyframes skeleton-container-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.skeleton-line {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-border) 40%, transparent) 0%,
    color-mix(in srgb, var(--color-border) 70%, transparent) 40%,
    color-mix(in srgb, var(--color-border) 40%, transparent) 80%
  );
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* -- Error state -- */
.error-state {
  animation: error-in 0.4s cubic-bezier(0.25, 1, 0.5, 1) both;
}
@keyframes error-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* -- Verse transition (between verses) -- */
.verse-fade-enter-active {
  transition:
    opacity 0.35s cubic-bezier(0.25, 1, 0.5, 1),
    transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}
.verse-fade-leave-active {
  transition: opacity 0.15s cubic-bezier(0.25, 1, 0.5, 1);
  position: absolute;
  inset: 0;
}
.verse-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.verse-fade-leave-to {
  opacity: 0;
}

.verse-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  cursor: pointer;
  transition:
    background 0.15s var(--ease-out),
    color 0.15s var(--ease-out);
}
.verse-action-btn:hover {
  background: color-mix(in srgb, var(--color-muted) 12%, transparent);
}

.verse-badge {
  animation: badge-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.18s;
}
@keyframes badge-in {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.verse-translation {
  animation: translation-rise 0.5s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.22s;
}
@keyframes translation-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* -- Bismillah -- */
.bismillah {
  animation: bismillah-reveal 0.8s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.05s;
}
@keyframes bismillah-reveal {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* -- Surah end ornament -- */
.surah-end {
  animation: surah-end-reveal 0.6s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.3s;
}
@keyframes surah-end-reveal {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.end-line-left {
  animation: line-grow-left 0.5s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.35s;
  transform-origin: right center;
}
.end-line-right {
  animation: line-grow-right 0.5s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.35s;
  transform-origin: left center;
}
@keyframes line-grow-left {
  from {
    opacity: 0;
    transform: scaleX(0);
  }
  to {
    opacity: 1;
    transform: scaleX(1);
  }
}
@keyframes line-grow-right {
  from {
    opacity: 0;
    transform: scaleX(0);
  }
  to {
    opacity: 1;
    transform: scaleX(1);
  }
}

.end-diamond {
  animation: diamond-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.45s;
}
@keyframes diamond-in {
  from {
    opacity: 0;
    transform: rotate(45deg) scale(0);
  }
  to {
    opacity: 1;
    transform: rotate(45deg) scale(1);
  }
}

.end-text {
  animation: end-text-in 0.4s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.55s;
}
@keyframes end-text-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
