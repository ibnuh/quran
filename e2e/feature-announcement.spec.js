import { test, expect, mockApi, waitForSurahLoad } from './fixtures.js'

const STORAGE_KEY = 'quran-player-prefs'
const ANNOUNCED_KEY = 'quran-footnotes-announced'

test.beforeEach(async ({ page }) => {
  mockApi(page)
})

test('returning users see the footnotes feature announcement once', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(
    ([prefsKey, announcedKey]) => {
      localStorage.setItem(
        prefsKey,
        JSON.stringify({ version: 2, translation: 'en.itani', surah: 1, verse: 0 })
      )
      localStorage.removeItem(announcedKey)
    },
    [STORAGE_KEY, ANNOUNCED_KEY]
  )
  await page.reload()
  await waitForSurahLoad(page)

  const banner = page.getByRole('status', { name: 'New: translation footnotes' })
  await expect(banner).toBeVisible({ timeout: 5000 })
  await expect(banner.getByText(/numbered notes/i)).toBeVisible()

  await banner.getByRole('button', { name: 'Got it' }).click()
  await expect(banner).toHaveCount(0)

  // Does not show again after dismiss.
  await page.reload()
  await waitForSurahLoad(page)
  await page.waitForTimeout(1500)
  await expect(page.getByRole('status', { name: 'New: translation footnotes' })).toHaveCount(0)
})

test('new users do not see the footnotes announcement', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(
    ([prefsKey, announcedKey]) => {
      localStorage.removeItem(prefsKey)
      localStorage.removeItem(announcedKey)
    },
    [STORAGE_KEY, ANNOUNCED_KEY]
  )
  await page.reload()
  await waitForSurahLoad(page)
  await page.waitForTimeout(1500)
  await expect(page.getByRole('status', { name: 'New: translation footnotes' })).toHaveCount(0)
})
