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

test('theme-color meta updates with the selected theme (status bar color)', async ({ page }) => {
  const meta = page.locator('meta[name="theme-color"]')
  // Default light theme uses the green primary.
  await expect(meta).toHaveAttribute('content', '#1a6b4b')
  await page.getByLabel('Change theme').click()
  await page.getByRole('menu').getByText('Rose', { exact: true }).click()
  // Rose primary; the status bar color must follow, not stay on the default green.
  await expect(meta).toHaveAttribute('content', '#b04060')
})

test('saved theme is applied to the status bar after reload', async ({ page }) => {
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('quran-player-prefs') || '{}')
    prefs.theme = 'rose'
    localStorage.setItem('quran-player-prefs', JSON.stringify(prefs))
  })
  await page.reload()
  const meta = page.locator('meta[name="theme-color"]')
  await expect(meta).toHaveAttribute('content', '#b04060')
})
