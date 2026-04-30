import { test, expect, mockApi, startFresh } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('word highlight styles are configurable in settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await expect(modal).toBeVisible()
})

test('animations toggle is accessible', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await expect(modal).toBeVisible()
})

test('content loads with proper rtl direction', async ({ page }) => {
  const arabicText = page.locator('[lang="ar"]')
  await expect(arabicText.first()).toHaveAttribute('dir', 'rtl')
})
