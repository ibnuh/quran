<script setup>
import { usePlayerStore } from '../stores/player.js'

defineEmits(['open-settings', 'toggle-verses'])
const store = usePlayerStore()
</script>

<template>
  <header class="flex items-center justify-between px-3 py-2.5 bg-primary text-white">
    <button
      class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
      title="Settings"
      @click="$emit('open-settings')"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
      </svg>
    </button>

    <div v-if="store.currentSurah" class="text-center flex-1 min-w-0 px-2">
      <h1 class="font-arabic text-lg leading-tight truncate">{{ store.currentSurah.name }}</h1>
      <p class="text-[0.7rem] opacity-75 truncate">{{ store.currentSurah.englishName }} - {{ store.currentSurah.englishNameTranslation }}</p>
    </div>
    <div v-else class="text-center flex-1">
      <h1 class="text-base font-semibold">Quran Player</h1>
    </div>

    <button
      class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
      title="Verse List"
      @click="$emit('toggle-verses')"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
      </svg>
    </button>
  </header>
</template>
