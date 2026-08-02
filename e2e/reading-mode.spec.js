import {
  test,
  expect,
  mockApi,
  waitForSurahLoad,
  installMockAudio,
  expectVerseChip
} from './fixtures.js'

const STORAGE_KEY = 'quran-player-prefs'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await installMockAudio(page)
})

async function enableReading(page) {
  await page.goto('/')
  await page.evaluate(key => {
    const prefs = JSON.parse(localStorage.getItem(key) || '{}')
    prefs.readingMode = true
    localStorage.setItem(key, JSON.stringify(prefs))
  }, STORAGE_KEY)
  await page.reload()
  await waitForSurahLoad(page)
}

test('continuous reading mode lists all verses', async ({ page }) => {
  await enableReading(page)
  await expect(page.locator('.reading-row')).toHaveCount(7)
  await expect(page.getByRole('button', { name: 'Select verse 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Select verse 6' })).toBeVisible()
})

test('tapping a verse in reading mode selects it', async ({ page }) => {
  await enableReading(page)
  await page.getByRole('button', { name: 'Select verse 3' }).click()
  await expectVerseChip(page, 3)
})
