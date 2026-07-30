import { test, expect, mockApi, waitForSurahLoad } from './fixtures.js'

const STORAGE_KEY = 'quran-player-prefs'

test.beforeEach(({ page }) => {
  mockApi(page)
})

async function enableReadMode(page) {
  await page.goto('/')
  await page.evaluate(key => {
    const prefs = JSON.parse(localStorage.getItem(key) || '{}')
    prefs.readMode = true
    prefs.readingMode = true
    localStorage.setItem(key, JSON.stringify(prefs))
  }, STORAGE_KEY)
  await page.reload()
  await waitForSurahLoad(page)
}

test('read mode shows continuous verses', async ({ page }) => {
  await enableReadMode(page)
  await expect(page.locator('.reading-row')).toHaveCount(7)
  await expect(page.getByRole('button', { name: 'Select verse 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Select verse 6' })).toBeVisible()
})

test('tapping a verse in read mode selects without requiring play controls to change verse label', async ({
  page
}) => {
  await enableReadMode(page)
  await page.getByRole('button', { name: 'Select verse 3' }).click()
  await expect(page.getByText('Verse 3 of 7')).toBeVisible()
})

test('play from here appears on the selected verse in read mode', async ({ page }) => {
  await enableReadMode(page)
  await page.getByRole('button', { name: 'Select verse 2' }).click()
  await expect(page.getByRole('button', { name: 'Play from here' })).toBeVisible()
})

test('read mode can be enabled from settings', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(key => localStorage.removeItem(key), STORAGE_KEY)
  await page.reload()
  await waitForSurahLoad(page)

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  const readToggle = modal.locator('label', { hasText: 'Read mode' })
  await readToggle.scrollIntoViewIfNeeded()
  await readToggle.locator('input[type="checkbox"]').check()
  await modal.getByLabel('Close settings').click()

  await expect(page.locator('.reading-row')).toHaveCount(7)
})

test('compact player hides progress seek in read mode', async ({ page }) => {
  await enableReadMode(page)
  // Progress bar uses a seek slider / progress control; full player has "Seek audio".
  await expect(page.getByLabel('Seek audio')).toHaveCount(0)
})
