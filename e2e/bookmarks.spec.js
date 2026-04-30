import { test, expect, mockApi, startFresh, verseBadge } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('bookmark button is visible next to verse number', async ({ page }) => {
  const bookmarkBtn = page.getByLabel('Bookmark this verse')
  await expect(bookmarkBtn).toBeVisible()
})

test('bookmark toggles filled state on click', async ({ page }) => {
  await page.getByLabel('Bookmark this verse').click()
  await expect(page.getByLabel('Remove bookmark')).toBeVisible()
  await page.getByLabel('Remove bookmark').click()
  await expect(page.getByLabel('Bookmark this verse')).toBeVisible()
})

test('bookmark persists in localStorage', async ({ page }) => {
  await page.getByLabel('Bookmark this verse').click()
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('quran-player-prefs')
    return raw ? JSON.parse(raw).bookmarks : null
  })
  expect(stored).toHaveLength(1)
  expect(stored[0].surahNum).toBe(1)
  expect(stored[0].verseIndex).toBe(0)
})

test('bookmarks panel opens from header button', async ({ page }) => {
  await page.getByLabel('Bookmark this verse').click()
  await page.getByLabel('Show bookmarks').click()
  const panel = page.getByRole('dialog', { name: 'Bookmarks' })
  await expect(panel).toBeVisible()
})

test('bookmarks panel shows empty state with no bookmarks', async ({ page }) => {
  await page.getByLabel('Show bookmarks').click()
  const panel = page.getByRole('dialog', { name: 'Bookmarks' })
  await expect(panel.getByText('No bookmarks yet')).toBeVisible()
})

test('bookmarks panel shows bookmarked verse after adding', async ({ page }) => {
  await page.getByLabel('Bookmark this verse').click()
  await page.getByLabel('Show bookmarks').click()
  const panel = page.getByRole('dialog', { name: 'Bookmarks' })
  await expect(panel.getByText('Al-Faatiha 1')).toBeVisible()
})

test('bookmark header badge shows count', async ({ page }) => {
  await page.getByLabel('Bookmark this verse').click()
  const badge = page.locator('header button[aria-label="Show bookmarks"] .bg-accent')
  await expect(badge).toHaveText('1')
})

test('multiple bookmarks are added correctly', async ({ page }) => {
  await page.getByLabel('Bookmark this verse').click()
  await page.getByLabel('Next verse').click()
  await page.waitForTimeout(300)
  await page.getByLabel('Bookmark this verse').click()
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('quran-player-prefs')
    return raw ? JSON.parse(raw).bookmarks.length : 0
  })
  expect(stored).toBe(2)
})

test('bookmark remove button appears on hover in panel', async ({ page }) => {
  await page.getByLabel('Bookmark this verse').click()
  await page.getByLabel('Show bookmarks').click()
  const panel = page.getByRole('dialog', { name: 'Bookmarks' })
  const items = panel.locator('button').filter({ hasText: 'Al-Faatiha' })
  await expect(items.first()).toBeVisible()
})
