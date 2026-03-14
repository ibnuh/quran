<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import SURAHS from '../data/surahs.js'
import RECITERS from '../data/reciters.js'
import TRANSLATIONS from '../data/translations.js'

const store = usePlayerStore()
const emit = defineEmits(['close'])

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="modal">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')"></div>

      <div class="relative bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-body">Settings</h2>
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface transition-colors text-muted cursor-pointer"
            @click="emit('close')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-muted mb-1.5">Surah</label>
            <select
              :value="store.currentSurahNum"
              class="select-field"
              @change="store.setSurah(parseInt($event.target.value))"
            >
              <option v-for="s in SURAHS" :key="s.number" :value="s.number">
                {{ s.number }}. {{ s.englishName }} - {{ s.englishNameTranslation }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-muted mb-1.5">Reciter</label>
            <select
              :value="store.currentReciter"
              class="select-field"
              @change="store.setReciter($event.target.value)"
            >
              <option v-for="r in RECITERS" :key="r.id" :value="r.id">
                {{ r.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-muted mb-1.5">Translation</label>
            <select
              :value="store.currentTranslation"
              class="select-field"
              @change="store.setTranslation($event.target.value)"
            >
              <option v-for="t in TRANSLATIONS" :key="t.identifier" :value="t.identifier">
                {{ t.englishName }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.select-field {
  width: 100%;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.9rem;
  padding: 0.65rem 2rem 0.65rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface);
  color: var(--color-body);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23777'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  transition: border-color 0.2s ease;
}
.select-field:focus {
  outline: none;
  border-color: var(--color-primary);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
