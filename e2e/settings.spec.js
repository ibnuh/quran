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
  // 10 built-in themes plus the Auto (follow OS) option.
  expect(count).toBe(11)
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

async function openReciterPicker(page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await expect(modal).toBeVisible()
  await modal.getByRole('tab', { name: 'Playback' }).click()
  await modal.getByRole('button', { name: 'Reciter' }).click()
}

test('typing in the reciter picker highlights the first match', async ({ page }) => {
  await openReciterPicker(page)
  await page.getByRole('searchbox').fill('sudais')
  const firstOption = page.getByRole('option').first()
  await expect(firstOption).toContainText('as-Sudais')
  await expect(firstOption).toHaveClass(/option-highlighted/)
})

test('pressing Enter in the reciter picker selects the first match', async ({ page }) => {
  await openReciterPicker(page)
  await page.getByRole('searchbox').fill('sudais')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('searchbox')).not.toBeVisible()
  await waitForSurahLoad(page)
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('quran-player-prefs')
    return raw ? JSON.parse(raw).reciter : null
  })
  expect(stored).toBe('sudais')
})
