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
    <div v-if="store.isLoading" class="animate-pulse">
      <div class="h-4 w-24 bg-border/50 rounded mx-auto mb-8"></div>
      <div class="space-y-4 mb-6" dir="rtl">
        <div class="h-10 bg-border/40 rounded-lg w-[90%] mx-auto"></div>
        <div class="h-10 bg-border/40 rounded-lg w-[70%] mx-auto"></div>
      </div>
      <div class="h-8 w-8 bg-border/30 rounded-full mx-auto mb-5"></div>
      <div class="space-y-2">
        <div class="h-4 bg-border/30 rounded w-[80%] mx-auto"></div>
        <div class="h-4 bg-border/30 rounded w-[60%] mx-auto"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="text-red-500">
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
    <div v-else-if="store.currentVerse" class="relative">
      <Transition name="verse-fade">
        <div :key="store.currentSurahNum + '-' + store.currentVerseIndex">
          <div v-if="store.showBismillah" class="bismillah mb-8">
            <p class="text-xl sm:text-2xl text-accent" dir="rtl" lang="ar" :style="{ fontFamily: store.arabicFontFamily }">
              {{"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"}}
            </p>
          </div>

          <p
            v-if="store.wordHighlight && hasWordTimings"
            class="leading-[2] text-arabic mb-5"
            dir="rtl"
            lang="ar"
            :style="{ fontFamily: store.arabicFontFamily, fontSize: store.arabicFontSize + 'rem', overflowWrap: 'break-word' }"
          ><template v-for="(word, i) in verseWords" :key="i"><span
              class="word-span"
              :class="{ 'word-active': i === store.currentWordIndex }"
            >{{ word }}</span>{{ i < verseWords.length - 1 ? ' ' : '' }}</template></p>
          <p
            v-else
            class="leading-[2] text-arabic mb-5"
            dir="rtl"
            lang="ar"
            :style="{ fontFamily: store.arabicFontFamily, fontSize: store.arabicFontSize + 'rem' }"
          >
            {{ store.currentVerse.text }}
          </p>

          <span
            class="verse-badge inline-block bg-primary/10 text-primary text-xs font-bold w-8 h-8 leading-8 rounded-full mt-4 mb-5"
          >
            {{ store.currentVerse.number }}
          </span>

          <p class="leading-relaxed text-muted font-light mx-auto" :style="{ fontSize: store.translationFontSize + 'rem', maxWidth: (store.contentWidth * 0.75) + 'rem' }">
            {{ store.currentTranslationVerse?.text }}
          </p>

          <div v-if="isLastVerse" class="surah-end mt-8">
            <div class="flex items-center gap-3 justify-center">
              <div class="h-px w-16 bg-border"></div>
              <div class="w-1.5 h-1.5 bg-accent/60 rotate-45 rounded-[1px]"></div>
              <div class="h-px w-16 bg-border"></div>
            </div>
            <p class="text-[0.65rem] text-muted/50 mt-3">
              End of {{ store.currentSurah?.englishName }}
            </p>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.word-span {
  transition: color 0.2s cubic-bezier(0.25, 1, 0.5, 1), text-shadow 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  border-radius: 0.25rem;
}
.word-active {
  color: var(--color-primary);
  text-shadow: 0 0 24px color-mix(in srgb, var(--color-primary) 35%, transparent);
}

.verse-fade-enter-active {
  transition: opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1), transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}
.verse-fade-leave-active {
  transition: opacity 0.15s cubic-bezier(0.25, 1, 0.5, 1);
  position: absolute;
  inset: 0;
}
.verse-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.verse-fade-leave-to {
  opacity: 0;
}

.verse-badge {
  animation: badge-in 0.4s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.15s;
}
@keyframes badge-in {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}

.bismillah {
  animation: bismillah-reveal 0.8s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.05s;
}
@keyframes bismillah-reveal {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.surah-end {
  animation: surah-end-reveal 0.6s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.25s;
}
@keyframes surah-end-reveal {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
