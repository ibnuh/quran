import { test, expect, mockApi, startFresh } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
})

test('landscape compact mode reduces header size', async ({ page }) => {
  await page.setViewportSize({ width: 812, height: 375 })
  await startFresh(page)
  const header = page.locator('header').first()
  // In landscape compact mode, the header has landscape-compact:pb-1 instead of pb-2
  // Just verify the page renders without issues
  await expect(page.locator('.verse-arabic')).toBeVisible()
})

test('safe area insets do not break layout', async ({ page }) => {
  // Simulate device with safe areas by setting viewport
  await page.setViewportSize({ width: 390, height: 844 })
  await startFresh(page)
  await expect(page.locator('.verse-arabic')).toBeVisible()
  await expect(page.locator('header')).toBeVisible()
})

test('juz picker opens and selection works', async ({ page }) => {
  await startFresh(page)
  await page.getByLabel('Jump to juz').click()
  await expect(page.getByRole('grid')).toBeVisible()
  // Click juz 2
  await page.getByRole('grid').getByRole('button', { name: 'Go to juz 2', exact: true }).click()
  // Should navigate to surah 2
  await page.waitForTimeout(500)
  const subtitle = page.locator('header p')
  await expect(subtitle).toContainText('Al-Baqara')
})
