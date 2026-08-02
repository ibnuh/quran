import {
  test,
  expect,
  mockApi,
  startFresh,
  playButton,
  pauseButton,
  installMockAudio,
  waitForSurahLoad
} from './fixtures.js'

const STORAGE_KEY = 'quran-player-prefs'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('mode menu opens and switches activity + layout', async ({ page }) => {
  const trigger = page.getByRole('button', { name: /Mode:/i })
  await expect(trigger).toBeVisible()
  await trigger.click()

  const menu = page.locator('.mode-menu')
  await expect(menu).toBeVisible()
  await expect(menu.getByText('How you use it')).toBeVisible()
  await expect(menu.getByText('How verses appear')).toBeVisible()

  // Apply both choices while the menu stays open (reopening races the transition).
  await menu.getByRole('menuitemradio', { name: /Read/i }).click()
  await menu.getByRole('menuitemradio', { name: /Continuous/i }).click()
  await expect(trigger).toContainText(/Read/i)
  await expect(page.locator('.reading-row')).toHaveCount(7)
})

test('read mode compact player still starts playback from play button', async ({ page }) => {
  await page.evaluate(key => {
    const prefs = JSON.parse(localStorage.getItem(key) || '{}')
    prefs.readMode = true
    prefs.readingMode = false
    localStorage.setItem(key, JSON.stringify(prefs))
  }, STORAGE_KEY)
  await page.reload()
  await waitForSurahLoad(page)

  // Compact player hides seek bar.
  await expect(page.getByLabel('Seek audio')).toHaveCount(0)
  await playButton(page).click()
  await expect(pauseButton(page)).toBeVisible()
})

test('mobile mode menu is centered and usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installMockAudio(page)
  await page.goto('/')
  await page.evaluate(key => localStorage.removeItem(key), STORAGE_KEY)
  await page.reload()
  await waitForSurahLoad(page)

  const trigger = page.getByRole('button', { name: /Mode:/i })
  await trigger.click()
  const menu = page.locator('.mode-menu')
  await expect(menu).toBeVisible()

  const box = await menu.boundingBox()
  expect(box).toBeTruthy()
  // Roughly centered: left edge not jammed into the right side of a 390px screen.
  expect(box.x).toBeLessThan(80)
  expect(box.x + box.width).toBeGreaterThan(310)
})
