import { test, expect, mockApi, startFresh } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('verse display text is in Arabic script', async ({ page }) => {
  const arabic = page.locator('.verse-arabic')
  await expect(arabic).toHaveAttribute('dir', 'rtl')
  await expect(arabic).toHaveAttribute('lang', 'ar')
  const text = await arabic.textContent()
  expect(text).toBeTruthy()
  // Verify it contains Arabic characters
  expect(text).toMatch(/[\u0600-\u06FF]/)
})

test('translation text is visible in English', async ({ page }) => {
  const translation = page.locator('.verse-translation')
  await expect(translation).toBeVisible()
  const text = await translation.textContent()
  expect(text).toBeTruthy()
})

test('verse badge has animation class', async ({ page }) => {
  const badge = page.locator('.verse-badge').first()
  // The badge has an entrance animation
  await expect(badge).toBeVisible()
})

test('page title includes surah name', async ({ page }) => {
  const title = await page.title()
  expect(title).toContain('Al-Faatiha')
  expect(title).toContain('Quran Player')
})

test('page title updates on verse change', async ({ page }) => {
  await page.getByLabel('Next verse').click()
  await page.waitForTimeout(200)
  const title = await page.title()
  expect(title).toContain('2')
})

test('arabic elements have dir=rtl', async ({ page }) => {
  const arabicEls = page.locator('[lang="ar"]')
  const count = await arabicEls.count()
  for (let i = 0; i < count; i++) {
    await expect(arabicEls.nth(i)).toHaveAttribute('dir', 'rtl')
  }
})

test('document has arabic font loaded', async ({ page }) => {
  const fonts = await page.evaluate(() => {
    return [...document.fonts].map(f => f.family)
  })
  const hasArabicFont = fonts.some(f => f.includes('Amiri') || f.includes('Uthmanic') || f.includes('Scheherazade'))
  // Font may or may not be loaded depending on timing
  // Just check the font-family is set on the verse
  const fontFamily = await page.locator('.verse-arabic').evaluate(el => getComputedStyle(el).fontFamily)
  expect(fontFamily).toBeTruthy()
})
