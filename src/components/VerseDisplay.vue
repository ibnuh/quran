<script setup>
import { usePlayerStore } from '../stores/player.js'

const emit = defineEmits(['retry'])
const store = usePlayerStore()
</script>

<template>
  <div class="text-center max-w-2xl w-full">
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
        <p class="font-arabic text-xl sm:text-2xl text-accent" dir="rtl">
          {{"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"}}
        </p>
      </div>

      <p class="font-arabic text-3xl sm:text-[2.5rem] leading-[2] text-arabic mb-5" dir="rtl">
        {{ store.currentVerse.text }}
      </p>

      <span class="inline-block bg-primary/10 text-primary text-xs font-bold w-8 h-8 leading-8 rounded-full mb-5">
        {{ store.currentVerse.number }}
      </span>

      <p class="text-base sm:text-lg leading-relaxed text-muted font-light max-w-lg mx-auto">
        {{ store.currentTranslationVerse?.text }}
      </p>
    </div>
  </div>
</template>
