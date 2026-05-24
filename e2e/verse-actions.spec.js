import { test, expect, mockApi, startFresh } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('verse action buttons are visible by default', async ({ page }) => {
  await expect(page.getByLabel('Bookmark this verse')).toBeVisible()
  await expect(page.getByLabel('Share this verse')).toBeVisible()
  await expect(page.getByLabel('Copy verse text')).toBeVisible()
})

test('toggling off a verse action hides its button', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  // The "Share" toggle in the Verse buttons section.
  const shareRow = modal.locator('label', { hasText: /^Share$/ })
  await shareRow.locator('input[type="checkbox"]').uncheck()
  await modal.getByLabel('Close settings').click()
  await expect(page.getByLabel('Share this verse')).toHaveCount(0)
  // Others remain.
  await expect(page.getByLabel('Bookmark this verse')).toBeVisible()
  await expect(page.getByLabel('Copy verse text')).toBeVisible()
})

test('verse action visibility persists across reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await modal.locator('label', { hasText: /^Copy$/ }).locator('input[type="checkbox"]').uncheck()
  await modal.getByLabel('Close settings').click()
  await page.reload()
  await expect(page.getByLabel('Copy verse text')).toHaveCount(0)
})
