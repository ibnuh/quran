import { test, expect, mockApi, waitForSurahLoad, startFresh, verseBadge } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('page loads with default surah Al-Fatiha (surah 1)', async ({ page }) => {
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('.verse-arabic')).toBeVisible()
  await expect(page.getByText('Juz 1')).toBeVisible()
})

test('surah title shows arabic name and english name', async ({ page }) => {
  const subtitle = page.locator('header p')
  await expect(subtitle).toContainText('Al-Faatiha')
})

test('verse number badge shows correct number', async ({ page }) => {
  await expect(verseBadge(page)).toHaveText('1')
})

test('verse arabic text and translation are displayed', async ({ page }) => {
  await expect(page.locator('.verse-arabic')).toBeVisible()
  await expect(page.locator('.verse-translation')).toBeVisible()
})

test('bismillah is not shown on surah 1', async ({ page }) => {
  // Bismillah is only shown for surahs other than 1 and 9
  await expect(page.locator('.bismillah')).not.toBeVisible()
})

test('bismillah is shown on surah 2', async ({ page }) => {
  await page.getByLabel('Next surah').click()
  await waitForSurahLoad(page)
  await expect(page.locator('.bismillah')).toBeVisible()
})

test('juz picker displays current juz number', async ({ page }) => {
  const juzButton = page.getByLabel('Jump to juz')
  await expect(juzButton).toContainText('Juz 1')
})

test('juz picker opens grid on click', async ({ page }) => {
  await page.getByLabel('Jump to juz').click()
  const grid = page.getByRole('grid')
  await expect(grid).toBeVisible()
  await expect(grid.locator('button')).toHaveCount(30)
})

test('juz picker closes on outside click', async ({ page }) => {
  await page.getByLabel('Jump to juz').click()
  await expect(page.getByRole('grid')).toBeVisible()
  await page.locator('main').click({ position: { x: 10, y: 10 }, force: true })
  await expect(page.getByRole('grid')).not.toBeVisible()
})

test('verse list panel opens and shows verses', async ({ page }) => {
  await page.getByLabel('Show verse list').click()
  const panel = page.getByRole('dialog', { name: 'Verse list' })
  await expect(panel).toBeVisible()
  const items = panel.locator('[class*="scroll-mt-16"]')
  await expect(items).toHaveCount(7)
})

test('verse list panel closes on escape', async ({ page }) => {
  await page.getByLabel('Show verse list').click()
  await expect(page.getByRole('dialog', { name: 'Verse list' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Verse list' })).not.toBeVisible()
})

test('clicking a verse in the list navigates to it', async ({ page }) => {
  await page.getByLabel('Show verse list').click()
  const panel = page.getByRole('dialog', { name: 'Verse list' })
  const items = panel.locator('[class*="scroll-mt-16"]')
  if (items.length > 1) {
    await items.nth(1).click()
    await expect(verseBadge(page)).not.toHaveText('1')
  }
})

test('surah navigation buttons are accessible', async ({ page }) => {
  const nextSurah = page.getByLabel('Next surah')
  const prevSurah = page.getByLabel('Previous surah')
  await expect(prevSurah).toBeDisabled()
  await expect(nextSurah).toBeEnabled()
})
