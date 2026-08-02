// Centralized configuration and constants.
// Keep magic numbers and storage keys here so they have a single source of truth.

// -- Persistence --
export const STORAGE_KEY = 'quran-player-prefs'
export const TIP_DISMISSED_KEY = 'quran-tip-dismissed'
// One-time “what's new” banners for returning users (key includes feature id).
export const FOOTNOTES_ANNOUNCED_KEY = 'quran-footnotes-announced'
// Set just before a user-accepted SW update reloads the page; cleared after boot recovery.
export const SW_JUST_UPDATED_KEY = 'quran-sw-just-updated'
// Runtime Workbox cache names for Quran audio (must match vite.config.js).
export const AUDIO_RUNTIME_CACHE_NAMES = ['quran-audio-files', 'quran-verse-audio-files']
// Bump when the persisted preferences shape changes in a non-additive way.
export const PREFS_VERSION = 2

// -- API endpoints --
export const TEXT_API = 'https://api.alquran.cloud/v1'
export const AUDIO_API = 'https://api.qurancdn.com/api/qdc/audio/reciters'
export const QURANCOM_API = 'https://api.quran.com/api/v4'

// -- Networking --
export const MAX_RETRIES = 2
export const RETRY_DELAY = 1000

// -- In-memory surah cache (LRU) --
export const SURAH_CACHE_MAX = 5

// -- UI timing --
export const AUTO_HIDE_DELAY = 3000
export const SAVE_PREFS_DEBOUNCE = 1000
export const MOBILE_TIP_TIMEOUT = 8000

// -- Playback --
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
export const SLEEP_TIMER_OPTIONS = [5, 10, 15, 30, 45, 60]

// Quran has 114 surahs.
export const TOTAL_SURAHS = 114

// -- Responsive breakpoints (px) and per-breakpoint display defaults --
export const RESPONSIVE_DEFAULTS = [
  { maxWidth: 480, arabicFontSize: 1.8, translationFontSize: 0.95, contentWidth: 100 },
  { maxWidth: 768, arabicFontSize: 2.0, translationFontSize: 1.0, contentWidth: 95 },
  { maxWidth: 1024, arabicFontSize: 2.5, translationFontSize: 1.1, contentWidth: 85 },
  { maxWidth: Infinity, arabicFontSize: 3.2, translationFontSize: 1.3, contentWidth: 80 }
]

export function getResponsiveDefaults(
  width = typeof window !== 'undefined' ? window.innerWidth : 1280
) {
  const match =
    RESPONSIVE_DEFAULTS.find(d => width < d.maxWidth) ||
    RESPONSIVE_DEFAULTS[RESPONSIVE_DEFAULTS.length - 1]
  return {
    arabicFontSize: match.arabicFontSize,
    translationFontSize: match.translationFontSize,
    contentWidth: match.contentWidth
  }
}

// Verse-mode preload count by connection quality.
export function getPreloadCount(
  connection = typeof navigator !== 'undefined' ? navigator.connection : null
) {
  if (!connection) {
    return 3
  }
  if (connection.effectiveType === '4g') {
    return 5
  }
  if (connection.effectiveType === '3g') {
    return 3
  }
  return 1
}
