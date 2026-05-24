import { test, expect, mockApi, startFresh } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
})

test('mobile viewport renders without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await startFresh(page)
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(overflowX).toBe(true)
})

test('tablet viewport renders correctly', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await startFresh(page)
  await expect(page.locator('.verse-arabic')).toBeVisible()
})

test('small screens move the surah indicator to a line below the navbar', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 800 })
  await startFresh(page)
  // Centered title is hidden; the compact line is shown with the surah name.
  await expect(page.locator('h1.surah-title')).toBeHidden()
  const compact = page.locator('header .sm\\:hidden')
  await expect(compact).toBeVisible()
  await expect(compact).toContainText('Al-Faatiha')
})

test('wide screens keep the centered surah title', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await startFresh(page)
  await expect(page.locator('h1.surah-title')).toBeVisible()
  await expect(page.locator('header .sm\\:hidden')).toBeHidden()
})

test('a long verse is not clipped at the top on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  // Override with a tall verse that exceeds the viewport height.
  const longText = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ '.repeat(14).trim()
  await page.route(/api\.alquran\.cloud\/v1\/surah/, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        data: [
          { edition: { identifier: 'quran-uthmani' }, ayahs: [{ numberInSurah: 1, text: longText }] },
          { edition: { identifier: 'en.itani' }, ayahs: [{ numberInSurah: 1, text: 'A long verse.' }] }
        ]
      })
    })
  })
  await startFresh(page)
  // At the top of the scroll area, the verse start must be reachable (not clipped above).
  const notClipped = await page.evaluate(() => {
    const main = document.querySelector('main')
    main.scrollTop = 0
    const verse = document.querySelector('.verse-arabic')
    return verse.getBoundingClientRect().top >= main.getBoundingClientRect().top - 1
  })
  expect(notClipped).toBe(true)
  // And the content genuinely overflows (so this is a real scroll case).
  const scrollable = await page.evaluate(() => {
    const main = document.querySelector('main')
    return main.scrollHeight > main.clientHeight
  })
  expect(scrollable).toBe(true)
})

test('desktop viewport shows quick settings toggle', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await startFresh(page)
  const toggleBtn = page.getByLabel('Toggle quick settings bar')
  await expect(toggleBtn).toBeVisible()
})

test('mobile viewport hides quick settings toggle', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await startFresh(page)
  await expect(page.getByLabel('Toggle quick settings bar')).not.toBeVisible()
})

test('touch targets meet minimum size on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await startFresh(page)
  const buttons = page.locator('header button')
  const count = await buttons.count()
  let allValid = true
  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox()
    if (box && (box.width < 40 || box.height < 40)) {
      allValid = false
      break
    }
  }
  expect(allValid).toBe(true)
})
