import { test, expect, mockApi, startFresh, verseBadge } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('share button is visible next to verse number', async ({ page }) => {
  await expect(page.getByLabel('Share this verse')).toBeVisible()
})

test('jump to verse button shows current verse', async ({ page }) => {
  const jumpBtn = page.getByLabel('Jump to verse')
  await expect(jumpBtn).toBeVisible()
  await expect(jumpBtn).toContainText('Verse 1 of 7')
})

test('jump to verse popover opens on click', async ({ page }) => {
  await page.getByLabel('Jump to verse').click()
  const input = page.locator('input[type="number"]')
  await expect(input).toBeVisible()
})

test('jump to verse navigates to typed number', async ({ page }) => {
  await page.getByLabel('Jump to verse').click()
  const input = page.locator('input[type="number"]')
  await input.fill('3')
  await page.locator('button:has-text("Go")').click()
  await expect(verseBadge(page)).toHaveText('3')
})

test('jump to verse closes on outside click', async ({ page }) => {
  await page.getByLabel('Jump to verse').click()
  const input = page.locator('input[type="number"]')
  await expect(input).toBeVisible()
  await page.locator('main').click({ position: { x: 50, y: 50 }, force: true })
  await expect(input).not.toBeVisible()
})

test('share button is accessible via keyboard', async ({ page }) => {
  const shareBtn = page.getByLabel('Share this verse')
  await shareBtn.focus()
  await expect(shareBtn).toBeFocused()
})
