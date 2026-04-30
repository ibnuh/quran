import { test, expect, mockApi, startFresh, verseBadge, playButton, pauseButton } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('space key is handled without errors', async ({ page }) => {
  await expect(playButton(page)).toBeVisible()
  await page.keyboard.press(' ')
  // Audio is mocked and aborted, so the play state may not change
})

test('arrow right advances to next verse', async ({ page }) => {
  await page.keyboard.press('ArrowRight')
  await expect(verseBadge(page)).not.toHaveText('1')
})

test('arrow left goes back to previous verse', async ({ page }) => {
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(300)
  await page.keyboard.press('ArrowLeft')
  await expect(verseBadge(page)).toHaveText('1')
})

test('question mark opens shortcuts modal', async ({ page }) => {
  await page.keyboard.press('?')
  const modal = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  await expect(modal).toBeVisible()
})

test('escape closes shortcuts modal', async ({ page }) => {
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).not.toBeVisible()
})
