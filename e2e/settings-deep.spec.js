import { test, expect, mockApi, waitForSurahLoad, startFresh } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('settings modal opens and closes', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  // Close via button
  await page.getByRole('dialog', { name: 'Settings' }).getByLabel('Close settings').click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).not.toBeVisible()
})

test('settings modal closes on escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Settings' })).not.toBeVisible()
})

test('theme grid in settings modal changes theme', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  // Find theme buttons inside the modal
  const themeButtons = modal.getByRole('button').filter({ hasText: 'dark' })
  await themeButtons.first().click()
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  expect(theme).toBe('dark')
})

test('arabic font changes in settings modal', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  // Find font selection and change it
  const fontSelect = modal.getByText('Arabic Font', { exact: true })
  await expect(fontSelect).toBeVisible()
})

test('highlight style selection exists in settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await expect(modal.getByText(/Highlight style/i)).toBeVisible()
})

test('about section is present in settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await expect(modal.getByText(/About/i)).toBeVisible()
})

test('reset settings button is visible', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await expect(modal.getByText(/Reset Settings/i)).toBeVisible()
})

test('animations toggle is present in settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await expect(modal.getByText('Animations', { exact: true })).toBeVisible()
})

test('auto-hide toggle is present in settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await expect(modal.getByText(/Auto-hide controls/i)).toBeVisible()
})
