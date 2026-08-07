<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import {
  toDisplayArabic,
  toVerseTokens,
  toTajweedWords,
  toArabicDigits,
  parseTajweed,
  tajweedColor
} from '../utils/arabicText.js'
import { qcfFontFamily } from '../utils/qcfFonts.js'

// Renders one verse's Arabic text, choosing the right representation (mushaf QCF glyphs,
// tajweed colors, word-by-word highlight, or plain) based on the active settings. Shared
// by the single-verse view and continuous reading so both behave identically. Word
// highlighting only lights up the verse currently being recited.
const props = defineProps({
  index: { type: Number, required: true },
  pStyle: { type: Object, default: () => ({}) },
  pClass: { type: String, default: '' },
  animate: { type: Boolean, default: false },
  // When provided by a parent list (e.g. ReadingView), inactive rows pass -1 so they
  // do not subscribe to store.currentWordIndex and re-render on every word tick.
  activeWordIndex: { type: Number, default: undefined }
})
const store = usePlayerStore()

const verse = computed(() => store.verses[props.index])
const tajweedSegments = computed(() => {
  const raw = store.tajweedVerses[props.index]
  return raw ? parseTajweed(raw) : []
})
const qcfWords = computed(() => store.qcfVerses[props.index] || [])

const mushafActive = computed(() => store.mushafMode && qcfWords.value.length > 0)
const tajweedActive = computed(() => store.tajweed && tajweedSegments.value.length > 0)

const hasWordTimings = computed(() => {
  if (store.playbackMode !== 'full') {
    return false
  }
  const timing = store.verseTimings[props.index]
  return !!(timing && timing.segments && timing.segments.length > 0)
})
// Prefer the prop when the parent isolates the active verse; otherwise fall back to
// store (single-verse display only ever renders the current index).
const activeWordIndex = computed(() => {
  if (props.activeWordIndex !== undefined) {
    return props.activeWordIndex
  }
  return props.index === store.currentVerseIndex ? store.currentWordIndex : -1
})
const wordHighlightOn = computed(() => store.wordHighlight && hasWordTimings.value)
const tajweedHighlightActive = computed(() => tajweedActive.value && wordHighlightOn.value)

const verseTokens = computed(() => (verse.value ? toVerseTokens(verse.value.text) : []))
const verseDisplayText = computed(() => toDisplayArabic(verse.value?.text || ''))
const tajweedWords = computed(() => toTajweedWords(tajweedSegments.value))
const qcfTokens = computed(() => {
  let wordIndex = -1
  return qcfWords.value.map(w => {
    if (!w.isEnd) {
      wordIndex++
    }
    return { code: w.code, page: w.page, isEnd: w.isEnd, wordIndex: w.isEnd ? -1 : wordIndex }
  })
})

const ornamentDigits = computed(() => (verse.value ? toArabicDigits(verse.value.number) : ''))

function wordHighlightClass(i) {
  const s = store.highlightStyle
  const cur = activeWordIndex.value
  return {
    'word-active-glow': i === cur && s === 'glow',
    'word-active-bg': i === cur && s === 'background',
    'word-active-underline': i === cur && s === 'underline',
    'word-active-minimal': i === cur && s === 'minimal',
    'word-active-sweep': i === cur && s === 'sweep',
    'word-read': i < cur && s === 'sweep',
    'word-flow': s === 'flow',
    'word-flow-done': i < cur && s === 'flow',
    'word-flow-active': i === cur && s === 'flow',
    'word-flow-next': i === cur + 1 && s === 'flow'
  }
}
</script>

<template>
  <p
    :class="[
      'verse-arabic text-arabic',
      pClass,
      { 'verse-qcf': mushafActive, 'verse-anim': animate }
    ]"
    dir="rtl"
    lang="ar"
    :style="pStyle"
  >
    <template v-if="mushafActive"
      ><template v-for="(w, i) in qcfTokens" :key="i"
        ><span
          class="word-span"
          :class="w.isEnd ? null : wordHighlightClass(w.wordIndex)"
          :style="{ fontFamily: qcfFontFamily(w.page) }"
          >{{ w.code }}</span
        >{{ i < qcfTokens.length - 1 ? ' ' : '' }}</template
      ></template
    ><template v-else
      ><template v-if="tajweedHighlightActive"
        ><template v-for="(w, i) in tajweedWords" :key="i"
          ><span class="word-span word-tajweed" :class="wordHighlightClass(w.wordIndex)"
            ><span
              v-for="(piece, pi) in w.pieces"
              :key="pi"
              :style="piece.rule ? { color: tajweedColor(piece.rule) } : null"
              >{{ piece.text }}</span
            ></span
          >{{ i < tajweedWords.length - 1 ? ' ' : '' }}</template
        ></template
      ><template v-else-if="tajweedActive"
        ><span
          v-for="(seg, i) in tajweedSegments"
          :key="i"
          :style="seg.rule ? { color: tajweedColor(seg.rule) } : null"
          >{{ seg.text }}</span
        ></template
      ><template v-else-if="wordHighlightOn"
        ><template v-for="(token, i) in verseTokens" :key="i"
          ><span class="word-span" :class="wordHighlightClass(i)">{{ token.display }}</span
          >{{ i < verseTokens.length - 1 ? ' ' : '' }}</template
        ></template
      ><template v-else
        ><span>{{ verseDisplayText }}</span></template
      ><span v-if="store.verseEndOrnament" class="ayah-ornament" aria-hidden="true"
        ><span class="ayah-ornament-num">{{ ornamentDigits }}</span></span
      ><slot v-else name="trailing"
    /></template>
  </p>
</template>

<style scoped>
/* Opacity-only entrance (single-verse view); avoids a GPU layer that can disturb
   OpenType mark positioning. Not used in reading mode to prevent re-animating on scroll. */
.verse-anim {
  animation: content-fade 0.5s cubic-bezier(0.25, 1, 0.5, 1) both;
  animation-delay: 0.05s;
}
@keyframes content-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* -- Inline end-of-ayah ornament -- */
.ayah-ornament {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.7em;
  height: 1.7em;
  padding: 0 0.25em;
  margin-inline-start: 0.35em;
  font-size: 0.5em;
  font-weight: 600;
  line-height: 1;
  vertical-align: middle;
  border-radius: 9999px;
  border: 1.5px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
/* Arabic-Indic numerals sit low in their em box, so flex centering leaves them below
   the circle's center; nudge them up to optically center the number in the ornament. */
.ayah-ornament-num {
  display: block;
  line-height: 1;
  transform: translateY(-0.15em);
}

/* -- Word highlight -- */
.word-span {
  transition:
    color 0.2s cubic-bezier(0.25, 1, 0.5, 1),
    text-shadow 0.3s cubic-bezier(0.25, 1, 0.5, 1),
    background-color 0.25s cubic-bezier(0.25, 1, 0.5, 1),
    text-decoration-color 0.2s cubic-bezier(0.25, 1, 0.5, 1);
  border-radius: 0.25rem;
  padding-inline: 0.08em;
  /* Small vertical padding so active backgrounds cover tall harakat (superscript
     alef, maddah) without clipping; inline padding does not shift the line layout. */
  padding-block: 0.12em;
  margin-inline: -0.08em;
  text-decoration-color: transparent;
  /* Render backgrounds/borders cleanly when a word wraps across two lines. */
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

/* Tajweed + word highlight: the chosen highlight style still applies (glow, underline,
   sweep, flow, etc.); per-letter tajweed colors win because they are set as inline styles
   on the inner spans, so only the non-colored letters take the highlight color. The
   "minimal" style is color-only, so give the active word a faint background as a fallback
   for fully-colored words where the color change would otherwise be invisible. */
.word-tajweed.word-active-minimal {
  background-color: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

/* Glow: color + text-shadow + subtle background */
.word-active-glow {
  color: var(--color-primary);
  text-shadow: 0 0 24px color-mix(in srgb, var(--color-primary) 35%, transparent);
  background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

/* Background: strong tinted background */
.word-active-bg {
  color: var(--color-primary);
  background-color: color-mix(in srgb, var(--color-primary) 15%, transparent);
}

/* Underline: color + thick underline */
.word-active-underline {
  color: var(--color-primary);
  text-decoration: underline;
  text-decoration-color: var(--color-primary);
  text-decoration-thickness: 3px;
  text-underline-offset: 0.15em;
}

/* Minimal: just a color change */
.word-active-minimal {
  color: var(--color-primary);
}

/* Sweep: running highlight, past words stay colored */
.word-read {
  color: var(--color-primary);
  opacity: 0.55;
}
.word-active-sweep {
  color: var(--color-primary);
  background: linear-gradient(
    to left,
    color-mix(in srgb, var(--color-primary) 18%, transparent),
    color-mix(in srgb, var(--color-primary) 6%, transparent)
  );
  animation: sweep-in 0.25s cubic-bezier(0.25, 1, 0.5, 1) both;
}
@keyframes sweep-in {
  from {
    background-size: 0% 100%;
    background-position: right;
  }
  to {
    background-size: 100% 100%;
    background-position: right;
  }
}

/* Flow: smooth running color wave through text */
.word-flow {
  transition:
    color 0.45s cubic-bezier(0.25, 1, 0.5, 1),
    opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}
.word-flow-done {
  color: var(--color-primary);
  opacity: 0.5;
}
.word-flow-active {
  color: var(--color-primary);
  opacity: 1;
}
.word-flow-next {
  color: color-mix(in srgb, var(--color-primary) 30%, var(--color-arabic));
}
</style>
