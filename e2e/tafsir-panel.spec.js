import { test, expect, mockApi, startFresh } from './fixtures.js'

function mockTafsir(page) {
  page.route(/api\.quran\.com\/api\/v4\/tafsirs\/\d+\/by_ayah\//, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tafsir: { text: '<h2>Commentary</h2><p>This is the tafsir for the verse.</p>' }
      })
    })
  })
}

test.beforeEach(async ({ page }) => {
  mockApi(page)
  mockTafsir(page)
  await startFresh(page)
})

test('tafsir button opens a panel with commentary', async ({ page }) => {
  await page.getByLabel('Open tafsir').click()
  const dialog = page.getByRole('dialog', { name: 'Tafsir' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('This is the tafsir for the verse.')).toBeVisible()
})

test('tafsir source can be switched', async ({ page }) => {
  await page.getByLabel('Open tafsir').click()
  const dialog = page.getByRole('dialog', { name: 'Tafsir' })
  await dialog.getByLabel('Tafsir source').selectOption('168')
  await expect(dialog.getByText('This is the tafsir for the verse.')).toBeVisible()
})

test('tafsir button can be hidden via settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  // Verse action toggles (including Tafsir) live under Display.
  await modal.getByRole('tab', { name: 'Display' }).click()
  const tafsirRow = modal.locator('label', { hasText: /^Tafsir$/ })
  await tafsirRow.scrollIntoViewIfNeeded()
  await tafsirRow.click()
  await modal.getByLabel('Close settings').click()
  await expect(page.getByLabel('Open tafsir')).toHaveCount(0)
})
