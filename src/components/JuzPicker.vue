<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import JUZS from '../data/juzs.js'

const store = usePlayerStore()
const emit = defineEmits(['close'])
const showPicker = ref(false)
const pickerRef = ref(null)

function toggle() {
  showPicker.value = !showPicker.value
}

function selectJuz(num) {
  const juz = JUZS.find(j => j.number === num)
  if (juz && (juz.startSurah !== store.currentSurahNum || juz.startVerse !== (store.verses[store.currentVerseIndex]?.number || 0))) {
    store.setJuz(num)
  }
  showPicker.value = false
}

function onClickOutside(e) {
  if (showPicker.value && pickerRef.value && !pickerRef.value.contains(e.target)) {
    showPicker.value = false
  }
}

function onKeydown(e) {
  if (!showPicker.value) return
  const buttons = Array.from(pickerRef.value?.querySelectorAll('[role="grid"] button') || [])
  if (!buttons.length) return
  const current = buttons.indexOf(document.activeElement)
  const cols = 5
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    const next = current + 1
    if (next < buttons.length) buttons[next].focus()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    const prev = current - 1
    if (prev >= 0) buttons[prev].focus()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    const next = current + cols
    if (next < buttons.length) buttons[next].focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    const prev = current - cols
    if (prev >= 0) buttons[prev].focus()
  } else if (e.key === 'Escape') {
    showPicker.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="pickerRef" class="relative juz-picker-wrapper" @keydown="onKeydown">
    <button
      class="flex items-center gap-1.5 px-2.5 py-1.5 min-w-11 min-h-11 justify-center rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer text-white hover:bg-white/10 active:scale-90 transition-all"
      aria-label="Jump to juz"
      @click.stop="toggle"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      <span>Juz {{ store.currentJuz }}</span>
    </button>

    <Transition name="theme-pop">
      <div
        v-if="showPicker"
        role="grid"
        aria-label="Select juz"
        class="absolute left-0 top-full mt-2 bg-card rounded-xl shadow-2xl border border-border p-2 z-50 w-[220px]"
      >
        <div class="grid grid-cols-5 gap-1">
          <button
            v-for="juz in JUZS"
            :key="juz.number"
            class="flex items-center justify-center w-9 h-9 rounded-lg text-sm transition-colors cursor-pointer"
            :class="store.currentJuz === juz.number ? 'bg-primary text-white font-medium' : 'text-body hover:bg-surface'"
            :aria-label="'Go to juz ' + juz.number"
            @click="selectJuz(juz.number)"
          >
            {{ juz.number }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
