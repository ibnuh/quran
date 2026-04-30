import { test, expect, mockApi, waitForSurahLoad, startFresh } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('bookmark navigation loads correct surah', async ({ page }) => {
  // Add bookmark on surah 1, verse 1
  await page.getByLabel('Bookmark this verse').click()
  // Navigate to another surah
  await page.getByLabel('Next surah').click()
  await waitForSurahLoad(page)
  // Open bookmarks and click the bookmark
  await page.getByLabel('Show bookmarks').click()
  const panel = page.getByRole('dialog', { name: 'Bookmarks' })
  await panel.locator('button').filter({ hasText: 'Al-Faatiha' }).click()
  // Should be back on surah 1, verse 1
  const badge = page.locator('.verse-badge').first()
  await expect(badge).toHaveText('1')
  const subtitle = page.locator('header p')
  await expect(subtitle).toContainText('Al-Faatiha')
})

test('bookmarks panel closes on escape', async ({ page }) => {
  await page.getByLabel('Bookmark this verse').click()
  await page.getByLabel('Show bookmarks').click()
  await expect(page.getByRole('dialog', { name: 'Bookmarks' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Bookmarks' })).not.toBeVisible()
})

test('bookmarks panel closes on backdrop click', async ({ page }) => {
  await page.getByLabel('Bookmark this verse').click()
  await page.getByLabel('Show bookmarks').click()
  await expect(page.getByRole('dialog', { name: 'Bookmarks' })).toBeVisible()
  await page.getByRole('presentation').click({ position: { x: 10, y: 10 } })
  await expect(page.getByRole('dialog', { name: 'Bookmarks' })).not.toBeVisible()
})

test('bookmark badge shows no indicator when empty', async ({ page }) => {
  const badge = page.locator('header button[aria-label="Show bookmarks"] .bg-accent')
  await expect(badge).not.toBeVisible()
})

test('clear all bookmarks removes them', async ({ page }) => {
  await page.getByLabel('Bookmark this verse').click()
  await page.getByLabel('Show bookmarks').click()
  const panel = page.getByRole('dialog', { name: 'Bookmarks' })
  await panel.getByText('Clear all').click()
  await expect(panel.getByText('No bookmarks yet')).toBeVisible()
})
