import { watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TOTAL_SURAHS } from '../config.js'

// Parse a surah/ayah location from the route path (preferred) or the legacy
// ?surah= query param. Returns nulls when nothing valid is present.
export function parseLocation(route) {
  let surah = parseInt(route.params.surah)
  let ayah = parseInt(route.params.ayah)
  if (!(surah >= 1 && surah <= TOTAL_SURAHS)) {
    surah = parseInt(route.query.surah)
    ayah = NaN
  }
  return {
    surah: surah >= 1 && surah <= TOTAL_SURAHS ? surah : null,
    ayah: ayah >= 1 ? ayah : null
  }
}

// Build a canonical, shareable URL path for a surah/ayah.
export function buildVerseUrl(surah, ayah) {
  return ayah ? `/${surah}/${ayah}` : `/${surah}`
}

// Trailing debounce for address bar writes: rapid navigation (held arrow key,
// scrubbing) must not spam history.replaceState, which browsers rate limit.
const URL_SYNC_DEBOUNCE = 300

// Keep the address bar in sync with the current surah/verse so copying the URL
// always shares the location being read (the canonical link meta already tracks
// it, but users copy the URL bar). replace() avoids one history entry per verse.
// `enabled` is a ref gated by the caller until the initial deep link and restored
// preferences have been applied, so boot never overwrites the requested URL.
export function useUrlSync(store, enabled) {
  const route = useRoute()
  const router = useRouter()
  let timer = null

  function apply() {
    timer = null
    if (!enabled.value || store.isLoading) {
      return
    }
    const ayah = store.currentVerse?.number
    if (!ayah) {
      return
    }
    const path = buildVerseUrl(store.currentSurahNum, ayah)
    if (route.path === path) {
      return
    }
    router.replace(path).catch(() => {
      // Navigation failures (redirected/duplicated) never matter for a URL sync.
    })
  }

  watch(
    () => [enabled.value, store.isLoading, store.currentSurahNum, store.currentVerse?.number],
    () => {
      clearTimeout(timer)
      timer = setTimeout(apply, URL_SYNC_DEBOUNCE)
    }
  )

  onBeforeUnmount(() => clearTimeout(timer))
}

// Reads the initial deep link and applies later in-app route changes (back/forward
// or internal links) via the provided onNavigate(surah, ayah) callback.
export function useDeepLink(onNavigate) {
  const route = useRoute()

  watch(
    () => [route.params.surah, route.params.ayah, route.query.surah],
    () => {
      const loc = parseLocation(route)
      if (loc.surah) {
        onNavigate(loc.surah, loc.ayah)
      }
    }
  )

  return {
    initial: () => parseLocation(route)
  }
}
