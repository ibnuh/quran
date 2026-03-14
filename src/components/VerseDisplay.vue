<script setup>
import { usePlayerStore } from '../stores/player.js'

defineProps({ isPlaying: Boolean })
const emit = defineEmits(['retry'])
const store = usePlayerStore()
</script>

<template>
  <div
    class="bg-card rounded-lg sm:rounded-xl border border-border shadow-sm min-h-[200px] flex flex-col items-center justify-center px-4 py-6 sm:px-8 sm:py-10 transition-all duration-200"
    :class="{ 'shadow-lg border-primary': isPlaying }"
  >
    <!-- Loading -->
    <div v-if="store.isLoading" class="text-center text-muted">
      <div class="w-9 h-9 border-3 border-border border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
      <p>Loading surah...</p>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="text-center text-red-700">
      <p class="mb-3">{{ store.error }}</p>
      <button
        class="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg text-sm cursor-pointer transition-colors duration-200"
        @click="emit('retry')"
      >Retry</button>
    </div>

    <!-- Verse content -->
    <div v-else-if="store.currentVerse" class="w-full text-center">
      <div v-if="store.showBismillah" class="mb-6 pb-4 border-b border-border">
        <p class="font-arabic text-2xl sm:text-[1.6rem] text-accent" dir="rtl">
          {{"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"}}
        </p>
      </div>
      <p class="font-arabic text-2xl sm:text-[2.2rem] leading-[2] text-arabic text-center mb-3" dir="rtl">
        {{ store.currentVerse.text }}
      </p>
      <span class="inline-block bg-primary text-white text-xs font-semibold w-7 h-7 leading-7 rounded-full text-center mb-3">
        {{ store.currentVerse.number }}
      </span>
      <p class="text-sm sm:text-base leading-relaxed text-body font-light max-w-[600px] mx-auto">
        {{ store.currentTranslationVerse?.text }}
      </p>
    </div>
  </div>
</template>
