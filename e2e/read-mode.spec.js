import { test, expect, mockApi, waitForSurahLoad } from './fixtures.js'

const STORAGE_KEY = 'quran-player-prefs'

test.beforeEach(({ page }) => {
  mockApi(page)
})

async function enableReadMode(page, { continuous = false } = {}) {
  await page.goto('/')
  await page.evaluate(
    ([key, continuousLayout]) => {
      const prefs = JSON.parse(localStorage.getItem(key) || '{}')
      prefs.readMode = true
      prefs.readingMode = continuousLayout
      localStorage.setItem(key, JSON.stringify(prefs))
    },
    [STORAGE_KEY, continuous]
  )
  await page.reload()
  await waitForSurahLoad(page)
}

test('read mode works with centered single-verse layout', async ({ page }) => {
  await enableReadMode(page, { continuous: false })
  await expect(page.locator('.reading-row')).toHaveCount(0)
  await expect(page.locator('.verse-arabic').first()).toBeVisible()
  // Compact player: no seek bar.
  await expect(page.getByLabel('Seek audio')).toHaveCount(0)
})

test('read mode with continuous layout lists all verses', async ({ page }) => {
  await enableReadMode(page, { continuous: true })
  await expect(page.locator('.reading-row')).toHaveCount(7)
  await expect(page.getByRole('button', { name: 'Select verse 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Select verse 6' })).toBeVisible()
})

test('tapping a verse in continuous read mode selects without auto-play chrome change', async ({
  page
}) => {
  await enableReadMode(page, { continuous: true })
  await page.getByRole('button', { name: 'Select verse 3' }).click()
  await expect(page.getByText('Verse 3 of 7')).toBeVisible()
})

test('play from here appears on the selected continuous verse in read mode', async ({ page }) => {
  await enableReadMode(page, { continuous: true })
  await page.getByRole('button', { name: 'Select verse 2' }).click()
  await expect(page.getByRole('button', { name: 'Play from here' })).toBeVisible()
})

test('settings offer read mode and independent layout options', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(key => localStorage.removeItem(key), STORAGE_KEY)
  await page.reload()
  await waitForSurahLoad(page)

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })

  const readToggle = modal.locator('label', { hasText: 'Read mode' })
  await readToggle.scrollIntoViewIfNeeded()
  await readToggle.locator('input[type="checkbox"]').check()

  await expect(modal.getByText('Reading layout')).toBeVisible()
  await modal.getByRole('button', { name: 'Continuous' }).click()
  await modal.getByLabel('Close settings').click()

  await expect(page.locator('.reading-row')).toHaveCount(7)

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal2 = page.getByRole('dialog', { name: 'Settings' })
  await modal2.getByRole('button', { name: 'Single verse' }).click()
  await modal2.getByLabel('Close settings').click()

  await expect(page.locator('.reading-row')).toHaveCount(0)
  await expect(page.locator('.verse-arabic').first()).toBeVisible()
})

test('compact player hides progress seek in read mode', async ({ page }) => {
  await enableReadMode(page, { continuous: false })
  await expect(page.getByLabel('Seek audio')).toHaveCount(0)
})
