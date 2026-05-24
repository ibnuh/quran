import { test, expect, mockApi, startFresh, verseBadge } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('search opens from the header', async ({ page }) => {
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByLabel('Search query')).toBeVisible()
})

test('searching a surah name navigates to it', async ({ page }) => {
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByLabel('Search query').fill('Baqara')
  await page.getByRole('button', { name: /Al-Baqara/ }).click()
  await expect(page.locator('header p')).toContainText('Baqara')
})

test('searching verse text jumps within the current surah', async ({ page }) => {
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByLabel('Search query').fill('verse 3')
  // Mock translations read "This is verse N"; pick the verse-3 result.
  await page.getByRole('button', { name: /This is verse 3/ }).click()
  await expect(verseBadge(page)).toHaveText('3')
})

test('search closes on Escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByLabel('Search query')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Search query')).not.toBeVisible()
})
