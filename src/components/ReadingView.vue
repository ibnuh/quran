<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import VerseArabic from './VerseArabic.vue'

const store = usePlayerStore()
const emit = defineEmits(['select'])
const rowsRef = ref(null)

// Reading rows use a slightly smaller Arabic size; alignment follows the justify setting.
const readingStyle = computed(() => ({
  fontFamily: store.arabicFontFamily,
  fontSize: store.arabicFontSize * store.arabicFontMetrics.sizeFactor * 0.7 + 'rem',
  lineHeight: store.arabicFontMetrics.lineHeight,
  textAlign: store.justifyText ? 'justify' : 'right',
  textAlignLast: store.justifyText ? 'right' : 'auto'
}))

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
      v-if="store.showBismillah"
      class="text-center text-accent mb-6 text-xl sm:text-2xl"
      dir="rtl"
      lang="ar"
      :style="{ fontFamily: store.arabicFontFamily }"
    >
      {{ 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' }}
    </p>

    <button
      v-for="(verse, i) in store.verses"
      :key="i"
      type="button"
      class="reading-row w-full text-right rounded-xl px-4 py-4 mb-2 cursor-pointer transition-colors"
      :class="i === store.currentVerseIndex ? 'reading-row-active bg-primary/10' : 'hover:bg-card'"
      :aria-current="i === store.currentVerseIndex ? 'true' : undefined"
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
