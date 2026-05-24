import { watch } from 'vue'
import { useRoute } from 'vue-router'
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
