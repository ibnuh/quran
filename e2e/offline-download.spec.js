import { test, expect, mockApi, startFresh, waitForSurahLoad } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  // Let the audio file fetch succeed so the download completes.
  await page.route(/download\.quranicaudio\.com\/.*\.mp3/, route =>
    route.fulfill({ status: 200, contentType: 'audio/mpeg', body: 'x' })
  )
  await startFresh(page)
})

test('a surah can be downloaded for offline and the state persists', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await modal.getByRole('tab', { name: 'App' }).click()
  await modal.getByRole('button', { name: /Download this surah/ }).click()
  await expect(modal.getByRole('button', { name: /Saved offline/ })).toBeVisible()

  // Persists across reload.
  await page.reload()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal2 = page.getByRole('dialog', { name: 'Settings' })
  await modal2.getByRole('tab', { name: 'App' }).click()
  await expect(modal2.getByRole('button', { name: /Saved offline/ })).toBeVisible()
})

test('downloaded state is tracked per reciter', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  await modal.getByRole('tab', { name: 'App' }).click()
  await modal.getByRole('button', { name: /Download this surah/ }).click()
  await expect(modal.getByRole('button', { name: /Saved offline/ })).toBeVisible()

  // Switching reciters must not show the other reciter's download as saved,
  // because the cached MP3s are reciter-specific.
  await modal.getByRole('tab', { name: 'Playback' }).click()
  await modal.getByRole('button', { name: 'Reciter' }).click()
  await page.getByRole('option', { name: /as-Sudais/ }).click()
  await waitForSurahLoad(page)
  await modal.getByRole('tab', { name: 'App' }).click()
  await expect(modal.getByRole('button', { name: /Download this surah/ })).toBeVisible()

  // Switching back restores the saved state for the original reciter.
  await modal.getByRole('tab', { name: 'Playback' }).click()
  await modal.getByRole('button', { name: 'Reciter' }).click()
  await page.getByRole('option', { name: 'Mishari Rashid al-Afasy', exact: true }).click()
  await waitForSurahLoad(page)
  await modal.getByRole('tab', { name: 'App' }).click()
  await expect(modal.getByRole('button', { name: /Saved offline/ })).toBeVisible()
})
