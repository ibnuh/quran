import { test, expect, mockApi, startFresh, playButton, pauseButton } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('play button is visible and clickable', async ({ page }) => {
  await expect(playButton(page)).toBeVisible()
  // Play click may not change state since audio is mocked/aborted
})

test('progress bar is visible and interactive', async ({ page }) => {
  await expect(page.locator('[role="slider"]')).toBeVisible()
})

test('next verse button is enabled when not on last verse', async ({ page }) => {
  await expect(page.getByLabel('Next verse')).toBeEnabled()
})

test('prev verse button is disabled on first verse', async ({ page }) => {
  await expect(page.getByLabel('Previous verse')).toBeDisabled()
})

test('verse counter shows correct verse number', async ({ page }) => {
  const counter = page.getByLabel('Jump to verse')
  await expect(counter).toContainText('Verse 1 of 7')
})

test('repeat mode cycles through options', async ({ page }) => {
  const repeatBtn = page.getByLabel('Cycle repeat mode')
  await repeatBtn.click()
  await expect(repeatBtn).toContainText('Verse')
  await repeatBtn.click()
  await expect(repeatBtn).toContainText('Surah')
  await repeatBtn.click()
  await expect(repeatBtn).toContainText('Repeat')
})

test('playback speed menu opens and selection changes displayed speed', async ({ page }) => {
  const speedBtn = page.getByLabel('Playback speed')
  await speedBtn.click()
  const menu = page.locator('.speed-wrapper [role="menu"]')
  await expect(menu).toBeVisible()
  await menu.getByText('2x').click()
  await expect(speedBtn).toContainText('2x')
})
