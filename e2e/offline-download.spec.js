import { test, expect, mockApi, startFresh } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  // Let the audio file fetch succeed so the download completes.
  await page.route(/example\.com\/audio\.mp3/, route =>
    route.fulfill({ status: 200, contentType: 'audio/mpeg', body: 'x' })
  )
  await startFresh(page)
})

test('a surah can be downloaded for offline and the state persists', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await modal.getByRole('button', { name: /Download this surah/ }).click()
  await expect(modal.getByRole('button', { name: /Saved offline/ })).toBeVisible()

  // Persists across reload.
  await page.reload()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: /Saved offline/ })
  ).toBeVisible()
})
