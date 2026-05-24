import { watch } from 'vue'

// Lock screen / notification playback controls via the Media Session API.
export function useMediaSession(store, handlers) {
  function update() {
    if (!('mediaSession' in navigator)) {
      return
    }
    const surah = store.currentSurah
    const verse = store.currentVerse
    if (!surah) {
      return
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${surah.englishName} - Verse ${verse?.number || 1}`,
      artist: store.currentReciterData?.name || 'Quran Player',
      album: surah.englishNameTranslation
    })

    navigator.mediaSession.setActionHandler('play', handlers.togglePlay)
    navigator.mediaSession.setActionHandler('pause', handlers.togglePlay)
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (store.canPrevVerse) {
        handlers.prevVerse()
      }
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (store.canNextVerse) {
        handlers.nextVerse()
      }
    })
  }

  watch(
    () => [store.currentSurahNum, store.currentVerseIndex, store.currentReciter],
    () => update()
  )

  return { update }
}
