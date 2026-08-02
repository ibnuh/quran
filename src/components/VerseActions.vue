<script setup>
import { computed, ref } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { buildVerseUrl } from '../composables/useDeepLink.js'

const emit = defineEmits(['open-tafsir'])
const store = usePlayerStore()
const copied = ref(false)

const hasAnyAction = computed(
  () =>
    store.verseActions.bookmark ||
    store.verseActions.share ||
    store.verseActions.copy ||
    store.verseActions.tafsir
)

function verseReference() {
  const surah = store.currentSurah
  const verse = store.currentVerse
  return `${surah.englishName} ${surah.number}:${verse.number}`
}

function canonicalUrl() {
  return `${window.location.origin}${buildVerseUrl(store.currentSurahNum, store.currentVerse.number)}`
}

function shareVerse() {
  const surah = store.currentSurah
  const verse = store.currentVerse
  const translation = store.currentTranslationVerse
  if (!surah || !verse) {
    return
  }

  const text = `${verseReference()}\n\n${verse.text}\n${translation?.text || ''}`
  const url = canonicalUrl()

  if (navigator.share) {
    navigator.share({ title: verseReference(), text, url }).catch(() => {})
  } else {
    navigator.clipboard.writeText(`${text}\n${url}`).catch(() => {})
  }
}

function copyVerse() {
  const surah = store.currentSurah
  const verse = store.currentVerse
  const translation = store.currentTranslationVerse
  if (!surah || !verse) {
    return
  }
  const text = `${verse.text}\n\n${translation?.text || ''}\n\n${verseReference()}\n${canonicalUrl()}`
  navigator.clipboard
    .writeText(text)
    .then(() => {
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 1500)
    })
    .catch(() => {})
}
</script>

<template>
  <div
    v-if="hasAnyAction"
    class="verse-actions"
    role="toolbar"
    :aria-label="$t('verse.actions')"
    @click.stop
  >
    <button
      v-if="store.verseActions.tafsir"
      type="button"
      class="verse-action-btn"
      :aria-label="$t('verse.openTafsir')"
      :title="$t('panels.tafsir')"
      @click="emit('open-tafsir')"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    </button>

    <button
      v-if="store.verseActions.bookmark"
      type="button"
      class="verse-action-btn"
      :class="{ 'is-active': store.isCurrentBookmarked }"
      :aria-label="
        store.isCurrentBookmarked ? $t('verse.removeBookmark') : $t('verse.bookmark')
      "
      :title="store.isCurrentBookmarked ? $t('verse.removeBookmark') : $t('verse.bookmark')"
      @click="store.toggleBookmark()"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        :fill="store.isCurrentBookmarked ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
      </svg>
    </button>

    <button
      v-if="store.verseActions.share"
      type="button"
      class="verse-action-btn"
      :aria-label="$t('verse.share')"
      :title="$t('verse.share')"
      @click="shareVerse"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
      </svg>
    </button>

    <button
      v-if="store.verseActions.copy"
      type="button"
      class="verse-action-btn"
      :class="{ 'is-copied': copied }"
      :aria-label="copied ? $t('verse.copied') : $t('verse.copy')"
      :title="copied ? $t('verse.copied') : $t('verse.copy')"
      @click="copyVerse"
    >
      <svg
        v-if="!copied"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
      </svg>
      <svg
        v-else
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.verse-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.2rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-surface) 88%, var(--color-card));
  border: 1px solid color-mix(in srgb, var(--color-border) 90%, transparent);
  box-shadow: 0 1px 2px color-mix(in srgb, #000 4%, transparent);
}

.verse-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9999px;
  cursor: pointer;
  color: var(--color-muted);
  transition:
    background 0.15s var(--ease-out, ease),
    color 0.15s var(--ease-out, ease),
    transform 0.1s ease;
}
.verse-action-btn:hover {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}
.verse-action-btn:active {
  transform: scale(0.94);
}
.verse-action-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.verse-action-btn.is-active {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
}
.verse-action-btn.is-copied {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}
</style>
