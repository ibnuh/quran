import { test, expect, mockApi, startFresh } from './fixtures.js'

function mockTajweed(page) {
  page.route(/api\.quran\.com\/api\/v4\/verses\/by_chapter/, route => {
    if (!route.request().url().includes('text_uthmani_tajweed')) {
      return route.continue()
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verses: Array.from({ length: 7 }, (_, i) => ({
          verse_number: i + 1,
          text_uthmani_tajweed: 'إِذَا <tajweed class=ghunnah>وَقَعَتِ</tajweed> ٱلْوَاقِعَةُ'
        }))
      })
    })
  })
}

test.beforeEach(async ({ page }) => {
  mockApi(page)
  mockTajweed(page)
  await startFresh(page)
})

async function enableTajweed(page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await modal.getByRole('tab', { name: 'Reading' }).click()
  await modal
    .locator('label', { hasText: 'Tajweed colors' })
    .locator('input[type="checkbox"]')
    .check()
  await modal.getByLabel('Close settings').click()
}

test('tajweed colors the verse and shows a legend', async ({ page }) => {
  await enableTajweed(page)
  // The verse renders a colored tajweed span (ghunnah = #e07b39 -> rgb(224, 123, 57)).
  const colored = page.locator('.verse-arabic span').filter({ hasText: 'وَقَعَتِ' })
  await expect(colored.first()).toHaveCSS('color', 'rgb(224, 123, 57)')
})

test('tajweed preference persists across reload', async ({ page }) => {
  await enableTajweed(page)
  await page.reload()
  const colored = page.locator('.verse-arabic span').filter({ hasText: 'وَقَعَتِ' })
  await expect(colored.first()).toHaveCSS('color', 'rgb(224, 123, 57)')
})
