<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player.js'

const emit = defineEmits(['retry'])
const store = usePlayerStore()

const verseWords = computed(() => {
  if (!store.currentVerse) return []
  return store.currentVerse.text.split(/\s+/).filter(w => w && !/^[\u06D6-\u06ED]$/.test(w))
})

const hasWordTimings = computed(() => {
  if (store.playbackMode !== 'full') return false
  const timing = store.verseTimings[store.currentVerseIndex]
  return timing && timing.segments && timing.segments.length > 0
})

const isLastVerse = computed(() =>
  store.totalVerses > 0 && store.currentVerseIndex === store.totalVerses - 1
)
</script>

<template>
  <div class="text-center w-full" :style="{ maxWidth: store.contentWidth + 'rem' }">
    <!-- Skeleton loading -->
    <div v-if="store.isLoading" class="skeleton-container" style="min-height: 40vh">
      <div class="skeleton-line h-4 w-24 rounded mx-auto mb-8"></div>
      <div class="space-y-5 mb-6" dir="rtl">
        <div class="skeleton-line h-12 rounded-lg w-[90%] mx-auto" style="animation-delay: 0.1s"></div>
        <div class="skeleton-line h-12 rounded-lg w-[70%] mx-auto" style="animation-delay: 0.2s"></div>
        <div class="skeleton-line h-12 rounded-lg w-[50%] mx-auto" style="animation-delay: 0.3s"></div>
      </div>
      <div class="skeleton-line h-8 w-8 rounded-full mx-auto mb-5" style="animation-delay: 0.15s"></div>
      <div class="space-y-2">
        <div class="skeleton-line h-4 rounded w-[80%] mx-auto" style="animation-delay: 0.25s"></div>
        <div class="skeleton-line h-4 rounded w-[60%] mx-auto" style="animation-delay: 0.35s"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="error-state text-red-500">
      <svg class="w-10 h-10 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <p class="mb-3 text-sm">{{ store.error }}</p>
      <button
        class="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg text-sm cursor-pointer transition-colors"
        aria-label="Retry loading surah"
        @click="emit('retry')"
      >Retry</button>
    </div>

    <!-- Verse -->
    <div v-else-if="store.currentVerse" class="relative" style="min-height: 40vh">
      <Transition name="verse-fade">
        <div :key="store.currentSurahNum + '-' + store.currentVerseIndex">
          <div v-if="store.showBismillah" class="bismillah mb-8">
            <p class="text-xl sm:text-2xl text-accent" dir="rtl" lang="ar" :style="{ fontFamily: store.arabicFontFamily }">
              {{"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"}}
            </p>
          </div>

          <p
            v-if="store.wordHighlight && hasWordTimings"
            class="verse-arabic leading-[2] text-arabic mb-5"
            dir="rtl"
            lang="ar"
            :style="{ fontFamily: store.arabicFontFamily, fontSize: store.arabicFontSize + 'rem', overflowWrap: 'break-word' }"
          ><template v-for="(word, i) in verseWords" :key="i"><span
              class="word-span"
              :class="{
                'word-active-glow': i === store.currentWordIndex && store.highlightStyle === 'glow',
                'word-active-bg': i === store.currentWordIndex && store.highlightStyle === 'background',
                'word-active-underline': i === store.currentWordIndex && store.highlightStyle === 'underline',
                'word-active-minimal': i === store.currentWordIndex && store.highlightStyle === 'minimal',
                'word-active-sweep': i === store.currentWordIndex && store.highlightStyle === 'sweep',
                'word-read': i < store.currentWordIndex && store.highlightStyle === 'sweep',
                'word-flow': store.highlightStyle === 'flow',
                'word-flow-done': i < store.currentWordIndex && store.highlightStyle === 'flow',
                'word-flow-active': i === store.currentWordIndex && store.highlightStyle === 'flow',
                'word-flow-next': i === store.currentWordIndex + 1 && store.highlightStyle === 'flow'
              }"
            >{{ word }}</span>{{ i < verseWords.length - 1 ? ' ' : '' }}</template></p>
          <p
            v-else
            class="verse-arabic leading-[2] text-arabic mb-5"
            dir="rtl"
            lang="ar"
            :style="{ fontFamily: store.arabicFontFamily, fontSize: store.arabicFontSize + 'rem', overflowWrap: 'break-word' }"
          >
            {{ store.currentVerse.text }}
          </p>

          <span
            class="verse-badge inline-block bg-primary/10 text-primary text-xs font-bold w-8 h-8 leading-8 rounded-full mt-4 mb-5"
          >
            {{ store.currentVerse.number }}
          </span>

          <p class="verse-translation leading-relaxed text-muted font-light mx-auto" :style="{ fontSize: store.translationFontSize + 'rem', maxWidth: (store.contentWidth * 0.75) + 'rem' }">
            {{ store.currentTranslationVerse?.text }}
          </p>

          <div v-if="isLastVerse" class="surah-end mt-8">
            <div class="flex items-center gap-3 justify-center">
              <div class="end-line-left h-px w-16 bg-border"></div>
              <div class="end-diamond w-1.5 h-1.5 bg-accent/60 rotate-45 rounded-[1px]"></div>
              <div class="end-line-right h-px w-16 bg-border"></div>
            </div>
            <p class="end-text text-[0.65rem] text-muted/50 mt-3">
              End of {{ store.currentSurah?.englishName }}
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
  from { opacity: 0; }
  to { opacity: 1; }
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
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* -- Error state -- */
.error-state {
  animation: error-in 0.4s cubic-bezier(0.25, 1, 0.5, 1) both;
}
@keyframes error-in {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

/* -- Word highlight -- */
.word-span {
  transition: color 0.2s cubic-bezier(0.25, 1, 0.5, 1),
    text-shadow 0.3s cubic-bezier(0.25, 1, 0.5, 1),
    background-color 0.25s cubic-bezier(0.25, 1, 0.5, 1),
    text-decoration-color 0.2s cubic-bezier(0.25, 1, 0.5, 1);
  border-radius: 0.25rem;
  padding-inline: 0.08em;
  margin-inline: -0.08em;
  text-decoration-color: transparent;
}

/* Glow: color + text-shadow + subtle background */
.word-active-glow {
  color: var(--color-primary);
  text-shadow: 0 0 24px color-mix(in srgb, var(--color-primary) 35%, transparent);
  background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

/* Background: strong tinted background */
.word-active-bg {
  color: var(--color-primary);
  background-color: color-mix(in srgb, var(--color-primary) 15%, transparent);
}

/* Underline: color + thick underline */
.word-active-underline {
  color: var(--color-primary);
  text-decoration: underline;
  text-decoration-color: var(--color-primary);
  text-decoration-thickness: 3px;
  text-underline-offset: 0.15em;
}

/* Minimal: just a color change */
.word-active-minimal {
  color: var(--color-primary);
}

/* Sweep: running highlight, past words stay colored */
.word-read {
  color: var(--color-primary);
  opacity: 0.55;
}
.word-active-sweep {
  color: var(--color-primary);
  background: linear-gradient(
    to left,
    color-mix(in srgb, var(--color-primary) 18%, transparent),
    color-mix(in srgb, var(--color-primary) 6%, transparent)
  );
  animation: sweep-in 0.25s cubic-bezier(0.25, 1, 0.5, 1) both;
}
@keyframes sweep-in {
  from {
    background-size: 0% 100%;
    background-position: right;
  }
  to {
    background-size: 100% 100%;
    background-position: right;
  }
}

/* Flow: smooth running color wave through text */
.word-flow {
  transition: color 0.45s cubic-bezier(0.25, 1, 0.5, 1),
    opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}
.word-flow-done {
  color: var(--color-primary);
  opacity: 0.5;
}
.word-flow-active {
  color: var(--color-primary);
  opacity: 1;
}
.word-flow-next {
  color: color-mix(in srgb, var(--color-primary) 30%, var(--color-arabic));
}

/* -- Verse transition (between verses) -- */
.verse-fade-enter-active {
  transition: opacity 0.35s cubic-bezier(0.25, 1, 0.5, 1), transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
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

/* -- Staggered content entrance (children animate in sequence) -- */
.verse-arabic {
  animation: content-rise 0.5s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.05s;
}
@keyframes content-rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.verse-badge {
  animation: badge-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.18s;
}
@keyframes badge-in {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}

.verse-translation {
  animation: translation-rise 0.5s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.22s;
}
@keyframes translation-rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* -- Bismillah -- */
.bismillah {
  animation: bismillah-reveal 0.8s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.05s;
}
@keyframes bismillah-reveal {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* -- Surah end ornament -- */
.surah-end {
  animation: surah-end-reveal 0.6s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.3s;
}
@keyframes surah-end-reveal {
  from { opacity: 0; }
  to { opacity: 1; }
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
  from { opacity: 0; transform: scaleX(0); }
  to { opacity: 1; transform: scaleX(1); }
}
@keyframes line-grow-right {
  from { opacity: 0; transform: scaleX(0); }
  to { opacity: 1; transform: scaleX(1); }
}

.end-diamond {
  animation: diamond-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.45s;
}
@keyframes diamond-in {
  from { opacity: 0; transform: rotate(45deg) scale(0); }
  to { opacity: 1; transform: rotate(45deg) scale(1); }
}

.end-text {
  animation: end-text-in 0.4s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.55s;
}
@keyframes end-text-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
