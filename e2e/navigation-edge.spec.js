import { test, expect, mockApi, waitForSurahLoad, startFresh, verseBadge } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('last verse shows surah end ornament', async ({ page }) => {
  // Navigate to last verse (index 6, verse 7 of 7)
  for (let i = 0; i < 6; i++) {
    await page.getByLabel('Next verse').click()
    await page.waitForTimeout(150)
  }
  // Mock only has 7 verses, so we're on last verse
  const ornament = page.locator('.surah-end')
  await expect(ornament).toBeVisible()
  await expect(ornament.getByText(/End of/)).toBeVisible()
})

test('surah end ornament shows correct surah name', async ({ page }) => {
  for (let i = 0; i < 6; i++) {
    await page.getByLabel('Next verse').click()
    await page.waitForTimeout(150)
  }
  await expect(page.locator('.surah-end')).toContainText('Al-Faatiha')
})

test('next verse button disabled on last verse', async ({ page }) => {
  for (let i = 0; i < 6; i++) {
    await page.getByLabel('Next verse').click()
    await page.waitForTimeout(150)
  }
  await expect(page.getByLabel('Next verse')).toBeDisabled()
})

test('navigating to surah 9 shows no bismillah', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('quran-player-prefs') || '{}')
    prefs.surah = 9
    localStorage.setItem('quran-player-prefs', JSON.stringify(prefs))
  })
  await page.reload()
  await waitForSurahLoad(page)
  await expect(page.locator('.bismillah')).not.toBeVisible()
})

test('surah 2 bismillah appears on first verse', async ({ page }) => {
  await page.getByLabel('Next surah').click()
  await waitForSurahLoad(page)
  await expect(page.locator('.bismillah')).toBeVisible()
})

test('verse list scrolls active verse into view', async ({ page }) => {
  // Navigate to later verse first, then open verse list
  for (let i = 0; i < 3; i++) {
    await page.getByLabel('Next verse').click()
    await page.waitForTimeout(150)
  }
  await page.getByLabel('Show verse list').click()
  const panel = page.getByRole('dialog', { name: 'Verse list' })
  await expect(panel).toBeVisible()
  // Active verse should have the verse-active class
  const activeItem = panel.locator('.verse-active')
  await expect(activeItem).toBeVisible()
})

test('verse list overlay click closes panel', async ({ page }) => {
  await page.getByLabel('Show verse list').click()
  await expect(page.getByRole('dialog', { name: 'Verse list' })).toBeVisible()
  // Click the backdrop overlay
  const backdrop = page.getByRole('presentation')
  await backdrop.click({ position: { x: 10, y: 10 } })
  await expect(page.getByRole('dialog', { name: 'Verse list' })).not.toBeVisible()
})
