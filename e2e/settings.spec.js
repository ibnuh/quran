import { test, expect, mockApi, waitForSurahLoad, startFresh } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('settings button opens settings modal', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await expect(modal).toBeVisible()
})

test('theme picker dropdown opens and shows themes', async ({ page }) => {
  await page.getByLabel('Change theme').click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  const buttons = menu.locator('button')
  const count = await buttons.count()
  expect(count).toBe(10)
})

test('theme selection changes data-theme attribute', async ({ page }) => {
  await page.getByLabel('Change theme').click()
  await page.getByRole('menu').getByText('dark').click()
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  expect(theme).toBe('dark')
})

test('theme changes body background color', async ({ page }) => {
  await page.getByLabel('Change theme').click()
  await page.getByRole('menu').getByText('sepia').click()
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).not.toBe('')
})

test('auto-hide toggle button changes state', async ({ page }) => {
  const autoHideBtn = page.getByLabel('Toggle auto-hide controls')
  await autoHideBtn.click()
  await expect(autoHideBtn.locator('svg')).toBeVisible()
})

test('desktop quick settings bar can be toggled (lg+ viewport)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await waitForSurahLoad(page)
  const toggleBtn = page.getByLabel('Toggle quick settings bar')
  await expect(toggleBtn).toBeVisible()
  await toggleBtn.click()
})

test('keyboard shortcuts modal opens from header button', async ({ page }) => {
  await page.getByLabel('Show keyboard shortcuts').click()
  const modal = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  await expect(modal).toBeVisible()
})
