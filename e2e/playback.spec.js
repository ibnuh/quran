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

test('seek during audio loading keeps the requested ayah and shows progress', async ({ page }) => {
  await page.evaluate(() => {
    window.__mockAudioLoadDelayMs = 800
    window.__mockAudioFailNextPlay = true
  })

  await playButton(page).click()
  await expect(page.getByRole('button', { name: 'Loading audio' })).toBeVisible()

  const slider = page.getByRole('slider', { name: 'Seek audio' })
  const box = await slider.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2)

  // 75% of the mocked 70s duration is 52.5s, inside ayah 6 (50-60s).
  await expectVerseChip(page, 6)
  await expect(slider).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('button', { name: 'Seeking audio' })).toBeVisible()

  await expect(pauseButton(page)).toBeVisible()
  await expect(slider).toHaveAttribute('aria-busy', 'false')
  await expectVerseChip(page, 6)
  await expect(slider).toHaveAttribute('aria-valuetext', /0:5[2-9] of 1:10/)
})

test('pause stops playback and play resumes', async ({ page }) => {
  await playButton(page).click()
  await expect(pauseButton(page)).toBeVisible()
  await pauseButton(page).click()
  await expect(playButton(page)).toBeVisible()
  await playButton(page).click()
  await expect(pauseButton(page)).toBeVisible()
})

test('pause during play startup is not undone by recovery retry', async ({ page }) => {
  await playButton(page).click()
  await expect(pauseButton(page)).toBeVisible()
  await pauseButton(page).click()

  // playAt waits briefly for media errors before retrying. A user pause during
  // that window must cancel the pending retry instead of restarting playback.
  await page.waitForTimeout(300)
  await expect(playButton(page)).toBeVisible()
})

test('service worker update teardown stops playback', async ({ page }) => {
  await playButton(page).click()
  await expect(pauseButton(page)).toBeVisible()

  await page.evaluate(() => {
    window.dispatchEvent(new Event('quran-before-sw-update'))
  })

  await expect(playButton(page)).toBeVisible()
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
