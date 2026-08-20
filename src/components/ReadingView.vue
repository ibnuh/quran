<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { fetchFootnote } from '../services/api.js'
import VerseArabic from './VerseArabic.vue'
import VerseActions from './VerseActions.vue'
import FootnotePanel from './FootnotePanel.vue'

const store = usePlayerStore()
const emit = defineEmits(['select', 'play-from', 'open-tafsir'])
const rowsRef = ref(null)
// { id, label } while the footnote side panel is open (active verse only).
const openFootnote = ref(null)

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

const canPlay = computed(() => store.canPlayAudio)

// Bismillah for the surah header (not tied to current verse index).
const showSurahBismillah = computed(
  () => store.currentSurahNum !== 1 && store.currentSurahNum !== 9
)

const showActiveActions = computed(
  () =>
    store.verseActions.bookmark ||
    store.verseActions.share ||
    store.verseActions.copy ||
    store.verseActions.tafsir
)

// Segments + markers only for the active verse when footnotes are enabled.
const activeTranslationSegments = computed(() => {
  const verse = store.currentTranslationVerse
  if (!store.showFootnotes) {
    const text = verse?.text
    return text ? [{ type: 'text', value: text }] : []
  }
  if (verse?.segments?.length) {
    return verse.segments
  }
  const text = verse?.text
  return text ? [{ type: 'text', value: text }] : []
})

function plainTranslation(i) {
  return store.translationVerses[i]?.text || ''
}

function prefetchFootnote(segment) {
  if (!segment?.id || !Number.isFinite(segment.id)) {
    return
  }
  void fetchFootnote(segment.id).catch(() => {})
}

function openFootnoteAt(segment) {
  if (openFootnote.value?.id === segment.id) {
    openFootnote.value = null
    return
  }
  prefetchFootnote(segment)
  openFootnote.value = {
    id: segment.id,
    label: segment.label
  }
}

function closeFootnote() {
  openFootnote.value = null
}

function selectFootnote(fn) {
  openFootnote.value = { id: fn.id, label: fn.label }
}

function scrollToActive(smooth = true) {
  const el = rowsRef.value?.querySelector('.reading-row-active')
  if (el) {
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' })
  }
}

// Follow playback / navigation by keeping the active verse in view.
watch(
  () => store.currentVerseIndex,
  () => {
    closeFootnote()
    nextTick(() => scrollToActive(true))
  }
)
watch(
  () => store.currentSurahNum,
  () => {
    closeFootnote()
    nextTick(() => scrollToActive(false))
  }
)
watch(() => [store.currentTranslation, store.showFootnotes], closeFootnote)

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
      v-memo="[
        i === store.currentVerseIndex,
        i === store.currentVerseIndex ? store.currentWordIndex : -1,
        i === store.currentVerseIndex ? openFootnote : null,
        plainTranslation(i),
        store.arabicFontSize,
        store.translationFontSize,
        store.arabicFontFamily,
        store.wordHighlight,
        store.highlightStyle,
        store.tajweed,
        store.mushafMode,
        store.justifyText,
        store.verseEndOrnament,
        store.showFootnotes,
        store.readMode,
        canPlay,
        store.verseActions.bookmark,
        store.verseActions.share,
        store.verseActions.copy,
        store.verseActions.tafsir
      ]"
      class="reading-row w-full text-right rounded-xl px-4 py-4 mb-2 transition-[background-color,box-shadow,border-color] duration-200"
      :class="i === store.currentVerseIndex ? 'reading-row-active' : 'hover:bg-card/80'"
      :aria-current="i === store.currentVerseIndex ? 'true' : undefined"
    >
      <!-- Arabic + plain translation stay in one select control; interactive
           controls (footnotes, actions, play) sit outside to avoid nested buttons. -->
      <button
        type="button"
        class="w-full text-right cursor-pointer"
        :aria-label="$t('reading.selectVerse', { n: verse.number })"
        @click="emit('select', i)"
      >
        <VerseArabic
          :index="i"
          :p-style="readingStyle"
          :active-word-index="i === store.currentVerseIndex ? store.currentWordIndex : -1"
        >
          <template #trailing>
            <span class="reading-ayah-num"
              ><span class="reading-ayah-num-inner">{{ verse.number }}</span></span
            >
          </template>
        </VerseArabic>
        <p
          v-if="i !== store.currentVerseIndex"
          class="text-muted font-light mt-2 text-start leading-relaxed"
          dir="auto"
          :style="{ fontSize: store.translationFontSize * 0.92 + 'rem' }"
        >
          {{ plainTranslation(i) }}
        </p>
      </button>

      <!-- Active verse: translation with optional footnote markers -->
      <p
        v-if="i === store.currentVerseIndex"
        class="text-muted font-light mt-2 text-start leading-relaxed"
        dir="auto"
        :style="{ fontSize: store.translationFontSize * 0.92 + 'rem' }"
      >
        <template v-for="(seg, si) in activeTranslationSegments" :key="si">
          <span v-if="seg.type === 'text'">{{ seg.value }}</span>
          <button
            v-else-if="seg.type === 'footnote'"
            type="button"
            class="fn-marker"
            :class="{ 'fn-marker-active': openFootnote?.id === seg.id }"
            :aria-label="$t('verse.footnoteN', { n: seg.label })"
            :aria-expanded="openFootnote?.id === seg.id ? 'true' : 'false'"
            :aria-controls="openFootnote?.id === seg.id ? 'footnote-panel' : undefined"
            :title="$t('verse.footnoteN', { n: seg.label })"
            @mouseenter="prefetchFootnote(seg)"
            @focus="prefetchFootnote(seg)"
            @click.stop="openFootnoteAt(seg)"
          >
            {{ seg.label }}
          </button>
        </template>
      </p>

      <!-- Active verse only: bookmark / share / copy / tafsir -->
      <div
        v-if="i === store.currentVerseIndex && showActiveActions"
        class="mt-2.5 flex justify-start"
      >
        <VerseActions @open-tafsir="emit('open-tafsir')" />
      </div>

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

    <!-- Single panel instance for the active verse (not per row). -->
    <FootnotePanel
      v-if="openFootnote"
      :footnote-id="openFootnote.id"
      :label="openFootnote.label"
      @close="closeFootnote"
      @select="selectFootnote"
    />
  </div>
</template>

<style scoped>
/* Skip rendering off-screen verses for long surahs (e.g. Al-Baqara, 286 verses)
   without true virtualization; near-zero risk and keeps scrolling smooth. */
.reading-row {
  content-visibility: auto;
  contain-intrinsic-size: auto 7rem;
  border: 1px solid transparent;
  position: relative;
}

.reading-row-active {
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-card));
  border-color: color-mix(in srgb, var(--color-primary) 22%, transparent);
  box-shadow:
    inset 3px 0 0 var(--color-primary),
    0 1px 3px color-mix(in srgb, #000 5%, transparent);
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
.reading-row-active .reading-ayah-num {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}
.reading-ayah-num-inner {
  display: block;
  line-height: 1;
}
</style>
