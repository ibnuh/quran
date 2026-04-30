import { test, expect, mockApi, waitForSurahLoad, startFresh } from './fixtures.js'

const STORAGE_KEY = 'quran-player-prefs'

test.beforeEach(async ({ page }) => {
  mockApi(page)
})

test('translation preference persists across reload', async ({ page }) => {
  await startFresh(page)
  // Set translation via store
  await page.evaluate(() => {
    const raw = localStorage.getItem('quran-player-prefs')
    const prefs = raw ? JSON.parse(raw) : {}
    prefs.translation = 'fr.hamidullah'
    localStorage.setItem('quran-player-prefs', JSON.stringify(prefs))
  })
  await page.reload()
  await waitForSurahLoad(page)
  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).translation : null
  }, STORAGE_KEY)
  expect(stored).toBe('fr.hamidullah')
})

test('reciter preference persists across reload', async ({ page }) => {
  await startFresh(page)
  await page.evaluate(() => {
    const raw = localStorage.getItem('quran-player-prefs')
    const prefs = raw ? JSON.parse(raw) : {}
    prefs.reciter = 'abdul_basit'
    localStorage.setItem('quran-player-prefs', JSON.stringify(prefs))
  })
  await page.reload()
  await waitForSurahLoad(page)
  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).reciter : null
  }, STORAGE_KEY)
  expect(stored).toBe('abdul_basit')
})

test('arabic font preference persists', async ({ page }) => {
  await startFresh(page)
  await page.evaluate(() => {
    const raw = localStorage.getItem('quran-player-prefs')
    const prefs = raw ? JSON.parse(raw) : {}
    prefs.arabicFont = 'uthmanic-hafs'
    localStorage.setItem('quran-player-prefs', JSON.stringify(prefs))
  })
  await page.reload()
  await waitForSurahLoad(page)
  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).arabicFont : null
  }, STORAGE_KEY)
  expect(stored).toBe('uthmanic-hafs')
})

test('all preference fields are saved in localStorage', async ({ page }) => {
  await startFresh(page)
  // Make some changes
  await page.getByLabel('Change theme').click()
  await page.getByRole('menu').getByText('dark').click()
  await page.waitForTimeout(200)
  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }, STORAGE_KEY)
  expect(stored).toBeTruthy()
  expect(stored).toHaveProperty('surah')
  expect(stored).toHaveProperty('verse')
  expect(stored).toHaveProperty('reciter')
  expect(stored).toHaveProperty('translation')
  expect(stored).toHaveProperty('arabicFont')
  expect(stored).toHaveProperty('arabicFontSize')
  expect(stored).toHaveProperty('translationFontSize')
  expect(stored).toHaveProperty('contentWidth')
  expect(stored).toHaveProperty('theme')
  expect(stored).toHaveProperty('autoHideControls')
  expect(stored).toHaveProperty('wordHighlight')
  expect(stored).toHaveProperty('highlightStyle')
  expect(stored).toHaveProperty('repeatMode')
  expect(stored).toHaveProperty('playbackSpeed')
  expect(stored).toHaveProperty('animations')
  expect(stored).toHaveProperty('bookmarks')
  expect(stored).toHaveProperty('recentSurahs')
})

test('recent surahs are tracked', async ({ page }) => {
  await startFresh(page)
  // Navigate to surah 2
  await page.getByLabel('Next surah').click()
  await waitForSurahLoad(page)
  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).recentSurahs : null
  }, STORAGE_KEY)
  expect(stored).toContain(2)
  // Surah 2 was visited after initial load, so it's in recent list
  expect(stored.length).toBeGreaterThanOrEqual(1)
})
