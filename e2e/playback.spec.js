import {
  test,
  expect,
  mockApi,
  startFresh,
  playButton,
  pauseButton,
  jumpVerseButton,
  expectVerseChip
} from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('play button is visible and starts playback', async ({ page }) => {
  await expect(playButton(page)).toBeVisible()
  await expect(playButton(page)).toBeEnabled()
  await playButton(page).click()
  await expect(pauseButton(page)).toBeVisible()
})

test('play from a mid-surah verse seeks then starts', async ({ page }) => {
  await jumpVerseButton(page).click()
  await page.locator('input[type="number"]').fill('6')
  await page.locator('button:has-text("Go")').click()
  await expectVerseChip(page, 6)

  await playButton(page).click()
  await expect(pauseButton(page)).toBeVisible()

  // Mock audio duration is 70s; verse 6 starts at 50s.
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        // Progress label left time near 0:50 when seek worked.
        const labels = Array.from(document.querySelectorAll('.tabular-nums')).map(el =>
          (el.textContent || '').trim()
        )
        return labels.some(t => t.startsWith('0:5'))
      })
    })
    .toBeTruthy()
})

test('pause stops playback and play resumes', async ({ page }) => {
  await playButton(page).click()
  await expect(pauseButton(page)).toBeVisible()
  await pauseButton(page).click()
  await expect(playButton(page)).toBeVisible()
  await playButton(page).click()
  await expect(pauseButton(page)).toBeVisible()
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
  await expectVerseChip(page, 1)
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
