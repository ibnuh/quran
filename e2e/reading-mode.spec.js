import { test, expect, mockApi } from './fixtures.js'

test.beforeEach(({ page }) => {
  mockApi(page)
})

async function enableReading(page) {
  await page.goto('/')
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('quran-player-prefs') || '{}')
    prefs.readingMode = true
    localStorage.setItem('quran-player-prefs', JSON.stringify(prefs))
  })
  await page.reload()
}

test('continuous reading mode lists all verses', async ({ page }) => {
  await enableReading(page)
  await expect(page.getByText('This is verse 1')).toBeVisible()
  await expect(page.getByText('This is verse 6')).toBeVisible()
})

test('tapping a verse in reading mode selects it', async ({ page }) => {
  await enableReading(page)
  await page.getByText('This is verse 3').click()
  await expect(page.getByText('Verse 3 of 7')).toBeVisible()
})
