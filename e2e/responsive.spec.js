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
