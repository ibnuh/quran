import { test, expect, mockApi, startFresh } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

async function openDisplaySettings(page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await modal.getByRole('tab', { name: 'Display' }).click()
  return modal
}

async function toggleAction(modal, labelText) {
  // Custom appearance:none switches can fail Playwright visibility checks on the
  // bare input; click the label row instead and force if still needed.
  const row = modal.locator('label', { hasText: new RegExp(`^${labelText}$`) })
  await row.scrollIntoViewIfNeeded()
  await row.click()
}

test('verse action buttons are visible by default', async ({ page }) => {
  await expect(page.getByLabel('Bookmark this verse')).toBeVisible()
  await expect(page.getByLabel('Share this verse')).toBeVisible()
  await expect(page.getByLabel('Copy verse text')).toBeVisible()
})

test('toggling off a verse action hides its button', async ({ page }) => {
  const modal = await openDisplaySettings(page)
  await toggleAction(modal, 'Share')
  await modal.getByLabel('Close settings').click()
  await expect(page.getByLabel('Share this verse')).toHaveCount(0)
  await expect(page.getByLabel('Bookmark this verse')).toBeVisible()
  await expect(page.getByLabel('Copy verse text')).toBeVisible()
})

test('verse action visibility persists across reload', async ({ page }) => {
  const modal = await openDisplaySettings(page)
  await toggleAction(modal, 'Copy')
  await modal.getByLabel('Close settings').click()
  await page.reload()
  await expect(page.getByLabel('Copy verse text')).toHaveCount(0)
})
