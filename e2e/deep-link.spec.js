import { test, expect, mockApi, waitForSurahLoad, verseBadge } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
})

test('deep link /surah loads that surah at verse 1', async ({ page }) => {
  await page.goto('/3')
  await waitForSurahLoad(page)
  await expect(page.locator('header p')).toContainText('Imraan')
  await expect(verseBadge(page)).toHaveText('1')
})

test('deep link /surah/ayah loads the requested verse', async ({ page }) => {
  await page.goto('/2/5')
  await waitForSurahLoad(page)
  await expect(page.locator('header p')).toContainText('Baqara')
  await expect(verseBadge(page)).toHaveText('5')
})

test('legacy ?surah= query still works', async ({ page }) => {
  await page.goto('/?surah=36')
  await waitForSurahLoad(page)
  await expect(page.locator('header p')).toContainText('Yaseen')
})

test('unknown path shows the not-found page', async ({ page }) => {
  await page.goto('/not-a-real-page')
  await expect(page.getByText(/not found|404|page/i).first()).toBeVisible({ timeout: 10000 })
})
