import { test, expect, waitForSurahLoad } from './fixtures.js'

// These tests set up their own API mocking, not relying on the default mockApi

function mockTextDelay(page, delayMs = 2000) {
  const body = {
    code: 200,
    data: [
      {
        edition: { identifier: 'quran-uthmani' },
        ayahs: Array.from({ length: 7 }, (_, i) => ({
          numberInSurah: i + 1,
          text: 'v' + (i + 1)
        }))
      },
      {
        edition: { identifier: 'en.itani' },
        ayahs: Array.from({ length: 7 }, (_, i) => ({
          numberInSurah: i + 1,
          text: 't' + (i + 1)
        }))
      }
    ]
  }
  const quranComBody = {
    verses: Array.from({ length: 7 }, (_, i) => ({
      verse_number: i + 1,
      text_uthmani: 'v' + (i + 1),
      translations: [{ text: 't' + (i + 1) }]
    }))
  }

  page.route(/api\.alquran\.cloud/, route => {
    setTimeout(() => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body)
      })
    }, delayMs)
  })
  // Default locale translation (en.sahih) uses quran.com.
  page.route(/api\.quran\.com\/api\/v4\/verses\/by_chapter\//, route => {
    setTimeout(() => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(quranComBody)
      })
    }, delayMs)
  })
}

function mockTextAndAudioFailure(page) {
  page.route(/api\.alquran\.cloud/, route => route.fulfill({ status: 500 }))
  page.route(/api\.quran\.com/, route => route.fulfill({ status: 500 }))
  page.route(/api\.qurancdn\.com/, route => route.fulfill({ status: 500 }))
  page.route(/alafasy/, route => route.fulfill({ status: 500 }))
  page.route(/\.mp3/, route => route.abort())
  page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort())
}

test('skeleton loading is shown while surah loads', async ({ page }) => {
  mockTextDelay(page, 2000)
  await page.route(/api\.qurancdn\.com/, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        audio_files: [{ audio_url: 'https://e.com/a.mp3', duration: 70, verse_timings: [] }]
      })
    })
  )
  await page.route(/\.mp3/, route => route.abort())
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort())

  await page.goto('/')
  await expect(page.locator('.skeleton-container')).toBeVisible({ timeout: 5000 })
  await waitForSurahLoad(page)
  await expect(page.locator('.skeleton-container')).not.toBeVisible()
})

test('error state shows retry button on API failure', async ({ page }) => {
  mockTextAndAudioFailure(page)

  await page.goto('/')
  const error = page.locator('.error-state')
  await expect(error).toBeVisible({ timeout: 30000 })
  await expect(error.getByRole('button', { name: 'Retry' })).toBeVisible()
})

test('offline banner appears when offline', async ({ page }) => {
  await page.route(/api\.alquran\.cloud/, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        data: [
          {
            edition: { identifier: 'quran-uthmani' },
            ayahs: Array.from({ length: 7 }, (_, i) => ({ numberInSurah: i + 1, text: 'v' }))
          },
          {
            edition: { identifier: 'en.itani' },
            ayahs: Array.from({ length: 7 }, (_, i) => ({ numberInSurah: i + 1, text: 't' }))
          }
        ]
      })
    })
  )
  await page.route(/api\.quran\.com\/api\/v4\/verses\/by_chapter\//, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verses: Array.from({ length: 7 }, (_, i) => ({
          verse_number: i + 1,
          text_uthmani: 'v',
          translations: [{ text: 't' }]
        }))
      })
    })
  )
  await page.route(/api\.qurancdn\.com/, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        audio_files: [{ audio_url: 'https://e.com/a.mp3', duration: 70, verse_timings: [] }]
      })
    })
  )
  await page.route(/\.mp3/, route => route.abort())
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort())

  await page.goto('/')
  await waitForSurahLoad(page)
  await page.context().setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await page.waitForTimeout(200)
  await expect(page.getByText('You are offline')).toBeVisible()
  await page.context().setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
})

test('error message is displayed on API failure', async ({ page }) => {
  mockTextAndAudioFailure(page)

  await page.goto('/')
  const error = page.locator('.error-state')
  await expect(error).toBeVisible({ timeout: 30000 })
  await expect(error).toContainText(/Failed|error|unavailable|reciter|check your connection/i)
  await expect(error.getByRole('button', { name: 'Retry' })).toBeVisible()
})
