import { test, expect, mockApi, startFresh, verseBadge, waitForSurahLoad } from './fixtures.js'

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

test('typing an ayah reference jumps to that verse in another surah', async ({ page }) => {
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByLabel('Search query').fill('2:5')
  await page.getByRole('button', { name: /Go to Al-Baqara 5/ }).click()
  await waitForSurahLoad(page)
  await expect(page.locator('header p')).toContainText('Baqara')
  await expect(verseBadge(page)).toHaveText('5')
})

test('an ayah reference within the current surah jumps directly', async ({ page }) => {
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByLabel('Search query').fill('1 3')
  await page.getByRole('button', { name: /Go to Al-Faatiha 3/ }).click()
  await expect(verseBadge(page)).toHaveText('3')
})

test('Arabic-Indic digit references are recognized', async ({ page }) => {
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByLabel('Search query').fill('٢:٢٥٥')
  await expect(page.getByRole('button', { name: /Go to Al-Baqara 255/ })).toBeVisible()
})

test('out-of-range references show no jump row', async ({ page }) => {
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByLabel('Search query').fill('1:8')
  await expect(page.getByText('No matches')).toBeVisible()
})

test('search closes on Escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByLabel('Search query')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Search query')).not.toBeVisible()
})
