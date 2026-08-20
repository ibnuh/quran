<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useFocusTrap } from '../composables/useFocusTrap.js'
import VerseItem from './VerseItem.vue'

const store = usePlayerStore()
const listRef = ref(null)
const panelRef = ref(null)
const emit = defineEmits(['close', 'select'])

useFocusTrap(panelRef, { onEscape: () => emit('close'), autoFocus: false })

function selectVerse(i) {
  emit('select', i)
  emit('close')
}

function scrollToActive(smooth = false) {
  if (!listRef.value) {
    return
  }
  const active = listRef.value.querySelector('.verse-active')
  if (active) {
    active.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' })
  }
}

onMounted(() => {
  nextTick(() => scrollToActive())
})

watch(
  () => store.currentVerseIndex,
  async () => {
    await nextTick()
    scrollToActive(true)
  }
)
</script>

<template>
  <Transition name="panel" appear>
    <div
      class="fixed top-0 right-0 bottom-0 left-0 z-50 flex justify-end"
      role="dialog"
      :aria-label="$t('panels.allVerses')"
      aria-modal="true"
    >
      <div
        class="absolute top-0 right-0 bottom-0 left-0 bg-black/40"
        role="presentation"
        @click="emit('close')"
      ></div>

      <div ref="panelRef" class="relative w-full sm:max-w-md lg:max-w-lg h-full shadow-2xl">
        <div class="bg-card h-full overflow-y-auto">
          <div
            class="sticky top-0 bg-card z-10 flex items-center justify-between gap-3 px-4 pb-3 border-b border-border"
            style="padding-top: max(0.75rem, env(safe-area-inset-top, 0px))"
          >
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-muted uppercase tracking-wider">
                {{ $t('panels.allVerses') }}
              </h3>
              <p v-if="store.currentSurah" class="text-xs text-body truncate mt-0.5">
                {{ store.currentSurah.englishName }}
                <span class="text-muted">· {{ store.totalVerses }}</span>
              </p>
            </div>
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface transition-colors text-muted cursor-pointer shrink-0"
              :aria-label="$t('panels.closeVerses')"
              @click="emit('close')"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                />
              </svg>
            </button>
          </div>

          <div ref="listRef" class="p-4 space-y-2 verse-list-items panel-list-safe-area">
            <VerseItem
              v-for="(verse, i) in store.verses"
              :key="verse.number"
              :verse="verse"
              :translation="store.translationVerses[i]"
              :is-active="i === store.currentVerseIndex"
              :class="{ 'verse-active': i === store.currentVerseIndex }"
              class="scroll-mt-16 verse-list-item"
              @select="selectVerse(i)"
            />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Skip painting off-screen rows in long surahs without a virtualizer dependency. */
.verse-list-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 5.5rem;
}

.panel-enter-active {
  transition: opacity 0.25s cubic-bezier(0.25, 1, 0.5, 1);
}
.panel-leave-active {
  transition: opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.panel-enter-active > :last-child {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-leave-active > :last-child {
  transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}
/* The drawer anchors to the inline-end edge (flex justify-end), which is the
   left side in RTL, so both the slide and the safe-area inset must mirror. */
.panel-enter-from > :last-child,
.panel-leave-to > :last-child {
  transform: translateX(100%);
}
[dir='rtl'] .panel-enter-from > :last-child,
[dir='rtl'] .panel-leave-to > :last-child {
  transform: translateX(-100%);
}

.panel-list-safe-area {
  padding-inline-end: max(1rem, env(safe-area-inset-right, 0px));
}
[dir='rtl'] .panel-list-safe-area {
  padding-inline-end: max(1rem, env(safe-area-inset-left, 0px));
}
</style>
