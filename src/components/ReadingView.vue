<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import VerseArabic from './VerseArabic.vue'

const store = usePlayerStore()
const emit = defineEmits(['select', 'play-from'])
const rowsRef = ref(null)

// Reading rows use a slightly smaller Arabic size; alignment follows the justify setting.
// Justify is ignored with the mushaf (QCF) font (its glyphs are pre-spaced for the page).
const justify = computed(() => store.justifyText && !store.mushafMode)
const readingStyle = computed(() => ({
  fontFamily: store.arabicFontFamily,
  fontSize: store.arabicFontSize * store.arabicFontMetrics.sizeFactor * 0.7 + 'rem',
  lineHeight: store.arabicFontMetrics.lineHeight,
  textAlign: justify.value ? 'justify' : 'right',
  textAlignLast: justify.value ? 'right' : 'auto'
}))

const canPlay = computed(
  () =>
    !store.audioUnavailable &&
    !!store.playbackMode &&
    (store.playbackMode === 'full' ? !!store.audioUrl : store.audioUrls.length > 0)
)

// Bismillah for the surah header (not tied to current verse index).
const showSurahBismillah = computed(
  () => store.currentSurahNum !== 1 && store.currentSurahNum !== 9
)

function scrollToActive(smooth = true) {
  const el = rowsRef.value?.querySelector('.reading-row-active')
  if (el) {
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' })
  }
}

// Follow playback / navigation by keeping the active verse in view.
watch(
  () => store.currentVerseIndex,
  () => nextTick(() => scrollToActive(true))
)
watch(
  () => store.currentSurahNum,
  () => nextTick(() => scrollToActive(false))
)

onMounted(() => nextTick(() => scrollToActive(false)))
</script>

<template>
  <div ref="rowsRef" class="w-full max-w-3xl mx-auto py-2">
    <p
      v-if="showSurahBismillah"
      class="text-center text-accent mb-6 text-xl sm:text-2xl"
      dir="rtl"
      lang="ar"
      :style="{ fontFamily: store.arabicFontFamily }"
    >
      {{ 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' }}
    </p>

    <div
      v-for="(verse, i) in store.verses"
      :key="i"
      class="reading-row w-full text-right rounded-xl px-4 py-4 mb-2 transition-colors"
      :class="i === store.currentVerseIndex ? 'reading-row-active bg-primary/10' : 'hover:bg-card'"
      :aria-current="i === store.currentVerseIndex ? 'true' : undefined"
    >
      <button
        type="button"
        class="w-full text-right cursor-pointer"
        :aria-label="$t('reading.selectVerse', { n: verse.number })"
        @click="emit('select', i)"
      >
        <VerseArabic :index="i" :p-style="readingStyle">
          <template #trailing>
            <span class="reading-ayah-num"
              ><span class="reading-ayah-num-inner">{{ verse.number }}</span></span
            >
          </template>
        </VerseArabic>
        <p
          class="text-muted font-light mt-2 text-left leading-relaxed"
          :style="{ fontSize: store.translationFontSize * 0.92 + 'rem' }"
        >
          {{ store.translationVerses[i]?.text }}
        </p>
      </button>

      <!-- Read mode: optional play from the focused verse -->
      <div
        v-if="store.readMode && i === store.currentVerseIndex && canPlay"
        class="mt-2.5 flex justify-start"
      >
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
          :aria-label="$t('reading.playFromHere')"
          @click.stop="emit('play-from', i)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          {{ $t('reading.playFromHere') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Skip rendering off-screen verses for long surahs (e.g. Al-Baqara, 286 verses)
   without true virtualization; near-zero risk and keeps scrolling smooth. */
.reading-row {
  content-visibility: auto;
  contain-intrinsic-size: auto 7rem;
}

.reading-ayah-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2em;
  height: 2em;
  margin-inline-start: 0.35em;
  padding: 0 0.2em;
  /* Render the ayah number in the UI font: the Arabic font's Latin digits have odd
     metrics and never center cleanly in the circle. */
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 0.42em;
  font-weight: 600;
  line-height: 1;
  vertical-align: middle;
  border-radius: 9999px;
  border: 1.5px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
  color: var(--color-accent);
}
.reading-ayah-num-inner {
  display: block;
  line-height: 1;
}
</style>
