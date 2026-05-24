import { test, expect, mockApi, startFresh } from './fixtures.js'

function mockQcf(page) {
  page.route(/api\.quran\.com\/api\/v4\/verses\/by_chapter\/\d+\?.*words=true/, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verses: Array.from({ length: 7 }, (_, i) => ({
          verse_number: i + 1,
          words: [
            { code_v2: 'ﱁ', v2_page: 1, char_type_name: 'word' },
            { code_v2: 'ﱂ', v2_page: 1, char_type_name: 'word' },
            { code_v2: 'ﱅ', v2_page: 1, char_type_name: 'end' }
          ]
        }))
      })
    })
  })
}

test.beforeEach(async ({ page }) => {
  mockApi(page)
  mockQcf(page)
  await page.route(/static\.qurancdn\.com/, route => route.abort()) // skip real fonts
  await startFresh(page)
})

test('mushaf (QCF) mode renders glyph words in the page font', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await modal
    .locator('label', { hasText: 'Mushaf font (QCF)' })
    .locator('input[type="checkbox"]')
    .check()
  await modal.getByLabel('Close settings').click()

  const glyph = page.locator('.verse-qcf .word-span').first()
  await expect(glyph).toBeVisible()
  await expect(glyph).toHaveCSS('font-family', /qcf2-p1/)
})
