<script setup>
import { computed, ref, watch } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { fetchFootnote } from '../services/api.js'
import VerseArabic from './VerseArabic.vue'
import VerseActions from './VerseActions.vue'
import FootnotePanel from './FootnotePanel.vue'

const emit = defineEmits(['retry', 'open-tafsir'])
const store = usePlayerStore()

// { id, label } while the footnote side panel is open.
const openFootnote = ref(null)

const translationSegments = computed(() => {
  const verse = store.currentTranslationVerse
  // When footnotes are disabled, always render plain text (no markers).
  if (!store.showFootnotes) {
    const text = verse?.text
    return text ? [{ type: 'text', value: text }] : []
  }
  if (verse?.segments?.length) {
    return verse.segments
  }
  const text = verse?.text
  return text ? [{ type: 'text', value: text }] : []
})

// Warm the footnote cache on hover/focus so the sheet opens instantly.
function prefetchFootnote(segment) {
  if (!segment?.id || !Number.isFinite(segment.id)) {
    return
  }
  void fetchFootnote(segment.id).catch(() => {})
}

function openFootnoteAt(segment) {
  // Toggle closed when the same marker is tapped again.
  if (openFootnote.value?.id === segment.id) {
    openFootnote.value = null
    return
  }
  prefetchFootnote(segment)
  openFootnote.value = {
    id: segment.id,
    label: segment.label
  }
}

function closeFootnote() {
  openFootnote.value = null
}

function selectFootnote(fn) {
  openFootnote.value = { id: fn.id, label: fn.label }
}

watch(
  () => [store.currentVerseIndex, store.currentSurahNum, store.currentTranslation, store.showFootnotes],
  closeFootnote
)

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

            <div class="flex items-center justify-center">
              <VerseActions @open-tafsir="emit('open-tafsir')" />
            </div>
          </div>

          <p
            class="verse-translation leading-relaxed text-muted font-normal mx-auto"
            :style="{
              fontSize: store.translationFontSize + 'rem',
              maxWidth: store.contentWidth * 0.75 + 'rem'
            }"
          >
            <template v-for="(seg, si) in translationSegments" :key="si">
              <span v-if="seg.type === 'text'">{{ seg.value }}</span>
              <button
                v-else-if="seg.type === 'footnote'"
                type="button"
                class="fn-marker"
                :class="{ 'fn-marker-active': openFootnote?.id === seg.id }"
                :aria-label="$t('verse.footnoteN', { n: seg.label })"
                :aria-expanded="openFootnote?.id === seg.id ? 'true' : 'false'"
                :aria-controls="openFootnote?.id === seg.id ? 'footnote-panel' : undefined"
                :title="$t('verse.footnoteN', { n: seg.label })"
                @mouseenter="prefetchFootnote(seg)"
                @focus="prefetchFootnote(seg)"
                @click="openFootnoteAt(seg)"
              >
                {{ seg.label }}
              </button>
            </template>
          </p>

          <FootnotePanel
            v-if="openFootnote"
            :footnote-id="openFootnote.id"
            :label="openFootnote.label"
            @close="closeFootnote"
            @select="selectFootnote"
          />

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
