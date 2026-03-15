<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player.js'

const emit = defineEmits(['retry'])
const store = usePlayerStore()

const verseWords = computed(() => {
  if (!store.currentVerse) return []
  return store.currentVerse.text.split(/\s+/).filter(Boolean)
})

const hasWordTimings = computed(() => {
  if (store.playbackMode !== 'full') return false
  const timing = store.verseTimings[store.currentVerseIndex]
  return timing && timing.segments && timing.segments.length > 0
})
</script>

<template>
  <div class="text-center w-full" :style="{ maxWidth: store.contentWidth + 'rem' }">
    <!-- Loading -->
    <div v-if="store.isLoading" class="text-muted">
      <div class="w-9 h-9 border-3 border-border border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-sm">Loading surah...</p>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="text-red-700">
      <p class="mb-3 text-sm">{{ store.error }}</p>
      <button
        class="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg text-sm cursor-pointer transition-colors"
        @click="emit('retry')"
      >Retry</button>
    </div>

    <!-- Verse -->
    <div v-else-if="store.currentVerse">
      <div v-if="store.showBismillah" class="mb-8">
        <p class="text-xl sm:text-2xl text-accent" dir="rtl" lang="ar" :style="{ fontFamily: store.arabicFontFamily }">
          {{"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"}}
        </p>
      </div>

      <p
        v-if="store.wordHighlight && hasWordTimings"
        class="leading-[2] text-arabic mb-5"
        dir="rtl"
        lang="ar"
        :style="{ fontFamily: store.arabicFontFamily, fontSize: store.arabicFontSize + 'rem' }"
      >
        <span
          v-for="(word, i) in verseWords"
          :key="i"
          class="word-span"
          :class="{ 'word-active': i === store.currentWordIndex }"
        >{{ word }} </span>
      </p>
      <p
        v-else
        class="leading-[2] text-arabic mb-5"
        dir="rtl"
        lang="ar"
        :style="{ fontFamily: store.arabicFontFamily, fontSize: store.arabicFontSize + 'rem' }"
      >
        {{ store.currentVerse.text }}
      </p>

      <span class="inline-block bg-primary/10 text-primary text-xs font-bold w-8 h-8 leading-8 rounded-full mb-5">
        {{ store.currentVerse.number }}
      </span>

      <p class="leading-relaxed text-muted font-light mx-auto" :style="{ fontSize: store.translationFontSize + 'rem', maxWidth: (store.contentWidth * 0.75) + 'rem' }">
        {{ store.currentTranslationVerse?.text }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.word-span {
  transition: color 0.15s ease, text-shadow 0.15s ease;
  border-radius: 0.25rem;
}
.word-active {
  color: var(--color-primary);
  text-shadow: 0 0 20px color-mix(in srgb, var(--color-primary) 30%, transparent);
}
</style>
