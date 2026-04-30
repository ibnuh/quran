import { test, expect, mockApi, waitForSurahLoad, startFresh } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('next surah button navigates to next surah', async ({ page }) => {
  await page.getByLabel('Next surah').click()
  await waitForSurahLoad(page)
  const subtitle = page.locator('header p')
  await expect(subtitle).not.toContainText('Al-Faatiha')
})

test('previous surah button is disabled on first surah', async ({ page }) => {
  await expect(page.getByLabel('Previous surah')).toBeDisabled()
})

test('last surah next button is disabled on surah 114', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('quran-player-prefs') || '{}')
    prefs.surah = 114
    localStorage.setItem('quran-player-prefs', JSON.stringify(prefs))
  })
  await page.reload()
  await waitForSurahLoad(page)
  await expect(page.getByLabel('Next surah')).toBeDisabled()
})

test('surah navigation buttons are keyboard accessible', async ({ page }) => {
  const nextBtn = page.getByLabel('Next surah')
  await nextBtn.focus()
  await expect(nextBtn).toBeFocused()
})
