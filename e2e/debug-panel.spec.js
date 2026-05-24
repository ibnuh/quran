import { test, expect, mockApi } from './fixtures.js'

test.beforeEach(({ page }) => {
  mockApi(page)
})

test('debug overlay is hidden by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('DEBUG', { exact: true })).toHaveCount(0)
})

test('?debug=1 shows diagnostics including version and display mode', async ({ page }) => {
  await page.goto('/?debug=1')
  await expect(page.getByText('DEBUG', { exact: true })).toBeVisible()
  await expect(page.getByText(/metaThemeColor:/)).toBeVisible()
  await expect(page.getByText(/displayStandalone:/)).toBeVisible()
  await expect(page.getByText(/version:/)).toBeVisible()
})

test('debug flag persists across reload and ?debug=0 clears it', async ({ page }) => {
  await page.goto('/?debug=1')
  await expect(page.getByText('DEBUG', { exact: true })).toBeVisible()
  await page.goto('/')
  await expect(page.getByText('DEBUG', { exact: true })).toBeVisible()
  await page.goto('/?debug=0')
  await expect(page.getByText('DEBUG', { exact: true })).toHaveCount(0)
})
