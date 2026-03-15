<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import THEMES from '../data/themes.js'

const emit = defineEmits(['open-settings', 'toggle-verses', 'toggle-shortcuts'])
const store = usePlayerStore()
const showThemePicker = ref(false)

function handleSettingsClick() {
  emit('open-settings')
}

function toggleThemePicker() {
  showThemePicker.value = !showThemePicker.value
}

function selectTheme(id) {
  store.setTheme(id)
  showThemePicker.value = false
}

function onClickOutside(e) {
  if (showThemePicker.value && !e.target.closest('.theme-picker-wrapper')) {
    showThemePicker.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <header class="flex items-center justify-between px-3 py-2 landscape-compact:py-1 bg-primary text-white">
    <div class="flex items-center gap-1">
      <button
        class="header-btn"
        aria-label="Settings"
        @click="handleSettingsClick"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
        <span>Settings</span>
      </button>
    </div>

    <div class="text-center flex-1 min-w-0 px-2">
      <h1
        class="font-arabic text-lg landscape-compact:text-sm leading-tight truncate"
        :title="store.currentSurah ? store.currentSurah.englishName + ' - ' + store.currentSurah.englishNameTranslation : ''"
      >{{ store.currentSurah ? store.currentSurah.name : 'Quran Player' }}</h1>
      <p class="text-[0.7rem] truncate landscape-compact:hidden" :class="store.currentSurah ? 'opacity-75' : 'opacity-0'">
        {{ store.currentSurah ? store.currentSurah.englishName + ' - ' + store.currentSurah.englishNameTranslation : '&nbsp;' }}
      </p>
    </div>

    <div class="flex items-center gap-1">
      <button
        class="hidden sm:flex header-btn opacity-60 hover:opacity-100"
        aria-label="Show keyboard shortcuts"
        @click="$emit('toggle-shortcuts')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
        </svg>
      </button>
      <div class="relative theme-picker-wrapper">
        <button
          class="header-btn"
          aria-label="Change theme"
          @click.stop="toggleThemePicker"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1-.01-.83.67-1.49 1.5-1.49H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
          <span class="hidden sm:inline">Theme</span>
        </button>
        <Transition name="theme-pop">
          <div
            v-if="showThemePicker"
            class="absolute right-0 top-full mt-2 bg-card rounded-xl shadow-2xl border border-border p-2 z-50 min-w-[160px]"
          >
            <button
              v-for="theme in THEMES"
              :key="theme.id"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-body transition-colors cursor-pointer"
              :class="store.theme === theme.id ? 'bg-primary/10 font-medium' : 'hover:bg-surface'"
              :aria-label="'Select ' + theme.name + ' theme'"
              @click="selectTheme(theme.id)"
            >
              <span
                class="w-5 h-5 rounded-full border-2 shrink-0"
                :style="{ background: theme.colors.surface, borderColor: theme.colors.primary }"
              ></span>
              <span>{{ theme.name }}</span>
              <svg v-if="store.theme === theme.id" class="ml-auto w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </button>
          </div>
        </Transition>
      </div>
      <button
        class="header-btn"
        :class="store.autoHideControls ? '' : 'opacity-50'"
        aria-label="Toggle auto-hide controls"
        @click="store.setAutoHideControls(!store.autoHideControls)"
      >
        <svg v-if="store.autoHideControls" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
        </svg>
        <span class="hidden sm:inline">Auto-hide</span>
      </button>
      <button
        class="header-btn"
        aria-label="Show verse list"
        @click="$emit('toggle-verses')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
        </svg>
        <span>Verses</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.header-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease;
}
.header-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.theme-pop-enter-active,
.theme-pop-leave-active {
  transition: all 0.15s ease;
}
.theme-pop-enter-from,
.theme-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>
