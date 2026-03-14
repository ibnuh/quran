<script setup>
import { usePlayerStore } from '../stores/player.js'

defineEmits(['open-settings', 'toggle-verses', 'toggle-settings-bar'])
const store = usePlayerStore()
</script>

<template>
  <header class="flex items-center justify-between px-3 py-2.5 landscape-compact:py-1 bg-primary text-white">
    <div class="flex items-center">
      <button
        class="md:hidden w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
        title="Settings"
        @click="$emit('open-settings')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
      </button>
      <button
        class="hidden md:flex w-10 h-10 rounded-full items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
        title="Toggle Settings Bar"
        @click="$emit('toggle-settings-bar')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
        </svg>
      </button>
    </div>

    <div v-if="store.currentSurah" class="text-center flex-1 min-w-0 px-2">
      <h1 class="font-arabic text-lg landscape-compact:text-sm leading-tight truncate">{{ store.currentSurah.name }}</h1>
      <p class="text-[0.7rem] opacity-75 truncate landscape-compact:hidden">{{ store.currentSurah.englishName }} - {{ store.currentSurah.englishNameTranslation }}</p>
    </div>
    <div v-else class="text-center flex-1">
      <h1 class="text-base font-semibold">Quran Player</h1>
    </div>

    <div class="flex items-center">
      <button
        class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
        :class="store.autoHideControls ? 'opacity-100' : 'opacity-50'"
        :title="store.autoHideControls ? 'Auto-hide: On' : 'Auto-hide: Off'"
        @click="store.setAutoHideControls(!store.autoHideControls)"
      >
        <svg v-if="store.autoHideControls" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
        </svg>
      </button>
      <button
        class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
        title="Verse List"
        @click="$emit('toggle-verses')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
        </svg>
      </button>
    </div>
  </header>
</template>
