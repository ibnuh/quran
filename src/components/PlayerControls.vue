<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import ProgressBar from './ProgressBar.vue'

const store = usePlayerStore()
const showSpeedMenu = ref(false)
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function onClickOutside(e) {
  if (showSpeedMenu.value && !e.target.closest('.speed-wrapper')) {
    showSpeedMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

defineProps({
  isPlaying: Boolean,
  progress: { type: Number, default: 0 },
  buffered: { type: Number, default: 0 },
  currentTimeMs: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 }
})

const emit = defineEmits(['toggle-play', 'prev-verse', 'next-verse', 'prev-surah', 'next-surah', 'seek', 'set-speed'])

function cycleRepeat() {
  const modes = ['none', 'verse', 'surah']
  const next = modes[(modes.indexOf(store.repeatMode) + 1) % modes.length]
  store.setRepeatMode(next)
}

function selectSpeed(speed) {
  emit('set-speed', speed)
  showSpeedMenu.value = false
}
</script>

<template>
  <div class="px-4 sm:px-12 pb-2 pt-2 landscape-compact:pb-1 landscape-compact:pt-1 landscape-compact:px-4 max-w-5xl mx-auto w-full pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
    <ProgressBar
      :progress="progress"
      :buffered="buffered"
      :current-time-ms="currentTimeMs"
      :duration-ms="durationMs"
      @seek="emit('seek', $event)"
    />

    <div class="grid grid-cols-[1fr_auto_1fr] items-center mt-1 landscape-compact:mt-1">
      <!-- Left group -->
      <div class="flex items-center justify-end gap-1 sm:gap-2">
        <button
          class="flex ctrl-btn"
          :class="store.repeatMode !== 'none' ? 'text-primary!' : ''"
          aria-label="Cycle repeat mode"
          @click="cycleRepeat"
        >
          <span v-if="store.repeatMode === 'verse'" class="relative inline-flex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
            <span class="absolute inset-0 flex items-center justify-center text-[7px] font-bold leading-none" style="padding-top: 1px">1</span>
          </span>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
          <span class="hidden sm:inline text-[0.7rem]">{{ store.repeatMode === 'none' ? 'Repeat' : store.repeatMode === 'verse' ? 'Verse' : 'Surah' }}</span>
        </button>

        <button
          class="ctrl-btn flex"
          :disabled="!store.canPrevSurah"
          aria-label="Previous surah"
          @click="emit('prev-surah')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          <span class="hidden sm:inline">Prev Surah</span>
        </button>

        <button
          class="flex ctrl-btn"
          :disabled="!store.canPrevVerse"
          aria-label="Previous verse"
          @click="emit('prev-verse')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          <span class="hidden sm:inline">Prev</span>
        </button>
      </div>

      <!-- Center: Play button -->
      <button
        class="w-14 h-14 landscape-compact:w-10 landscape-compact:h-10 rounded-full bg-primary text-white flex items-center justify-center mx-3 shadow-md hover:bg-primary-dark hover:scale-105 active:scale-[0.97] transition-all duration-200 cursor-pointer shrink-0"
        :aria-label="isPlaying ? 'Pause' : 'Play'"
        @click="emit('toggle-play')"
      >
        <svg v-if="!isPlaying" width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        <svg v-else width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>

      <!-- Right group -->
      <div class="flex items-center justify-start gap-1 sm:gap-2">
        <button
          class="flex ctrl-btn"
          :disabled="!store.canNextVerse"
          aria-label="Next verse"
          @click="emit('next-verse')"
        >
          <span class="hidden sm:inline">Next</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>

        <button
          class="ctrl-btn flex"
          :disabled="!store.canNextSurah"
          aria-label="Next surah"
          @click="emit('next-surah')"
        >
          <span class="hidden sm:inline">Next Surah</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>

        <!-- Speed -->
        <div class="relative speed-wrapper">
          <button
            class="flex ctrl-btn"
            :class="store.playbackSpeed !== 1 ? 'text-primary!' : ''"
            aria-label="Playback speed"
            @click.stop="showSpeedMenu = !showSpeedMenu"
          >
            <span class="text-[0.7rem] font-semibold tabular-nums">{{ store.playbackSpeed }}x</span>
          </button>
          <Transition name="speed-pop">
            <div v-if="showSpeedMenu" class="absolute bottom-full right-0 mb-2 bg-card rounded-lg shadow-2xl border border-border p-1 z-50 min-w-[4.5rem]">
              <button
                v-for="s in SPEEDS"
                :key="s"
                class="w-full px-3 py-1.5 text-xs text-center rounded cursor-pointer transition-colors"
                :class="store.playbackSpeed === s ? 'bg-primary/10 text-primary font-semibold' : 'text-body hover:bg-surface'"
                @click="selectSpeed(s)"
              >{{ s }}x</button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <div class="text-center text-xs text-muted mt-3 landscape-compact:hidden" :class="store.currentVerse ? '' : 'invisible'">
      Verse {{ store.currentVerse?.number || 0 }} of {{ store.totalVerses || 0 }}
    </div>
  </div>
</template>

<style scoped>
.ctrl-btn {
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: none;
  background: none;
  color: var(--color-body);
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ctrl-btn:hover:not(:disabled) {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
.ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.speed-pop-enter-active,
.speed-pop-leave-active {
  transition: all 0.15s ease;
}
.speed-pop-enter-from,
.speed-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
}
</style>
