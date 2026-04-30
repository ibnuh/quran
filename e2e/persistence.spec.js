import { test, expect, mockApi, waitForSurahLoad, startFresh, playButton } from './fixtures.js'

const STORAGE_KEY = 'quran-player-prefs'

test.beforeEach(async ({ page }) => {
  mockApi(page)
})

test('preferences are saved after theme change', async ({ page }) => {
  await startFresh(page)
  await page.getByLabel('Change theme').click()
  await page.getByRole('menu').getByText('dark').click()
  await page.waitForTimeout(200)
  const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  expect(stored).toBeTruthy()
  const parsed = JSON.parse(stored)
  expect(parsed.surah).toBe(1)
  expect(parsed.theme).toBe('dark')
})

test('theme persists across page reload', async ({ page }) => {
  await startFresh(page)
  await page.getByLabel('Change theme').click()
  await page.getByRole('menu').getByText('dark').click()
  await page.waitForTimeout(300)
  // Reload - addInitScript is NOT used so localStorage survives
  await page.reload()
  await waitForSurahLoad(page)
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  expect(theme).toBe('dark')
})

test('playback speed persists across reload', async ({ page }) => {
  await startFresh(page)
  await page.getByLabel('Playback speed').click()
  await page.locator('.speed-wrapper [role="menu"]').getByText('1.5x').click()
  await page.waitForTimeout(300)
  await page.reload()
  await waitForSurahLoad(page)
  const speedBtn = page.getByLabel('Playback speed')
  await expect(speedBtn).toContainText('1.5x')
})

test('bookmarks persist across page reload', async ({ page }) => {
  await startFresh(page)
  await page.getByLabel('Bookmark this verse').click()
  await page.waitForTimeout(300)
  // Reload - bookmarks survive reload
  await page.reload()
  await waitForSurahLoad(page)
  const badge = page.locator('header button[aria-label="Show bookmarks"] .bg-accent')
  await expect(badge).toHaveText('1')
})

test('restoring prefs from localStorage loads correct surah', async ({ page }) => {
  // Set prefs BEFORE first navigation
  await page.goto('/')
  await page.evaluate(({ key, prefs }) => {
    localStorage.setItem(key, JSON.stringify(prefs))
  }, {
    key: STORAGE_KEY,
    prefs: {
      surah: 2,
      verse: 0,
      reciter: 'alafasy',
      translation: 'en.itani',
      arabicFont: 'amiri-quran',
      arabicFontSize: 2.5,
      translationFontSize: 1.1,
      contentWidth: 80,
      theme: 'dark',
      autoHideControls: true,
      wordHighlight: true,
      highlightStyle: 'flow',
      repeatMode: 'none',
      playbackSpeed: 1,
      animations: true
    }
  })
  await page.reload()
  await waitForSurahLoad(page)
  const subtitle = page.locator('header p')
  await expect(subtitle).toContainText('Al-Baqara')
})

test('no localStorage crash on first visit', async ({ page }) => {
  await page.goto('/')
  await waitForSurahLoad(page)
  await expect(page.locator('.verse-arabic')).toBeVisible()
  await expect(playButton(page)).toBeVisible()
})
