import { test as base, expect } from '@playwright/test'

const STORAGE_KEY = 'quran-player-prefs'

export function mockApi(page) {
  // Mock alquran.cloud: /v1/surah/{num}/editions/{editions}
  // Returns { code, data: [{ edition, ayahs: [{ numberInSurah, text }] }, ...] }
  page.route(/api\.alquran\.cloud\/v1\/surah/, (route) => {
    const ayahs = Array.from({ length: 7 }, (_, i) => ({
      numberInSurah: i + 1,
      text: `\u0622\u064A\u064E\u0629\u064F \u0627\u0644\u0652\u0622\u064A\u064E\u0629\u0650 ${i + 1}`
    }))
    const translationAyahs = Array.from({ length: 7 }, (_, i) => ({
      numberInSurah: i + 1,
      text: `This is verse ${i + 1}`
    }))
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        data: [
          { edition: { identifier: 'quran-uthmani' }, ayahs },
          { edition: { identifier: 'en.itani' }, ayahs: translationAyahs }
        ]
      })
    })
  })

  // Mock qurancdn.com: /api/qdc/audio/reciters/{id}/audio_files?chapter={n}&segments=true
  page.route(/api\.qurancdn\.com/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        audio_files: [{
          audio_url: 'https://example.com/audio.mp3',
          duration: 70,
          verse_timings: Array.from({ length: 7 }, (_, i) => ({
            verse_key: `1:${i + 1}`,
            timestamp_from: i * 10000,
            timestamp_to: (i + 1) * 10000,
            segments: []
          }))
        }]
      })
    })
  })

  page.route(/\.mp3/, (route) => route.abort())
  page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
}

export async function waitForSurahLoad(page) {
  await page.waitForFunction(() => {
    const loading = document.querySelector('.skeleton-container')
    const verse = document.querySelector('.verse-arabic')
    const error = document.querySelector('.error-state')
    return (!loading && verse) || error
  }, { timeout: 30000 })
}

// Navigate, clear any stale prefs, reload, wait for surah
export async function startFresh(page) {
  await page.goto('/')
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
  await page.reload()
  await waitForSurahLoad(page)
}

export function playButton(page) {
  return page.getByRole('button', { name: 'Play', exact: true })
}

export function pauseButton(page) {
  return page.getByRole('button', { name: 'Pause', exact: true })
}

export function verseBadge(page) {
  return page.locator('.verse-badge').first()
}

export const test = base
export { expect }
