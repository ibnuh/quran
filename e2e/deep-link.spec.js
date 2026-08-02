import {
  test,
  expect,
  mockApi,
  waitForSurahLoad,
  verseBadge,
  installMockAudio,
  expectVerseChip
} from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await installMockAudio(page)
})

test('deep link /surah loads that surah at verse 1', async ({ page }) => {
  await page.goto('/3')
  await waitForSurahLoad(page)
  await expect(page.locator('header p')).toContainText('Imraan')
  await expect(verseBadge(page)).toHaveText('1')
})

test('per-surah SEO metadata updates (title, canonical, og)', async ({ page }) => {
  await page.goto('/2/5')
  await waitForSurahLoad(page)
  await expect(page).toHaveTitle(/Al-Baqara 5/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/2\/5$/)
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Al-Baqara 5/)
})

test('deep link /surah/ayah loads the requested verse', async ({ page }) => {
  await page.goto('/2/5')
  await waitForSurahLoad(page)
  await expect(page.locator('header p')).toContainText('Baqara')
  await expect(verseBadge(page)).toHaveText('5')
  await expectVerseChip(page, 5)
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
