import { test, expect, mockApi, waitForSurahLoad, startFresh } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

test('repeat verse mode label updates on click', async ({ page }) => {
  const repeatBtn = page.getByLabel('Cycle repeat mode')
  await repeatBtn.click()
  await expect(repeatBtn).toContainText('Verse')
  await repeatBtn.click()
  await expect(repeatBtn).toContainText('Surah')
  await repeatBtn.click()
  await expect(repeatBtn).toContainText('Repeat')
})

test('speed menu closes on escape', async ({ page }) => {
  await page.getByLabel('Playback speed').click()
  const menu = page.locator('.speed-wrapper [role="menu"]')
  await expect(menu).toBeVisible()
  // Focus a menu button first, then press Escape
  await menu.locator('button').first().focus()
  await page.keyboard.press('Escape')
  await expect(menu).not.toBeVisible()
})

test('speed menu closes on outside click', async ({ page }) => {
  await page.getByLabel('Playback speed').click()
  await expect(page.locator('.speed-wrapper [role="menu"]')).toBeVisible()
  await page.locator('main').click({ position: { x: 50, y: 50 }, force: true })
  await expect(page.locator('.speed-wrapper [role="menu"]')).not.toBeVisible()
})

test('jump to verse with enter key navigates correctly', async ({ page }) => {
  await page.getByLabel('Jump to verse').click()
  const input = page.locator('input[type="number"]')
  await input.fill('5')
  await input.press('Enter')
  const badge = page.locator('.verse-badge').first()
  await expect(badge).toHaveText('5')
})

test('jump to verse with out of range number does nothing', async ({ page }) => {
  await page.getByLabel('Jump to verse').click()
  const input = page.locator('input[type="number"]')
  await input.fill('999')
  await page.locator('button:has-text("Go")').click()
  const badge = page.locator('.verse-badge').first()
  await expect(badge).toHaveText('1')
})

test('previous surah navigates correctly from surah 2', async ({ page }) => {
  // Go to surah 2
  await page.getByLabel('Next surah').click()
  await waitForSurahLoad(page)
  // Go back to surah 1
  await page.getByLabel('Previous surah').click()
  await waitForSurahLoad(page)
  const subtitle = page.locator('header p')
  await expect(subtitle).toContainText('Al-Faatiha')
})

test('multiple verse navigations update badge correctly', async ({ page }) => {
  const badge = page.locator('.verse-badge').first()
  await page.getByLabel('Next verse').click()
  await page.waitForTimeout(150)
  await expect(badge).toHaveText('2')
  await page.getByLabel('Next verse').click()
  await page.waitForTimeout(150)
  await expect(badge).toHaveText('3')
  await page.getByLabel('Previous verse').click()
  await page.waitForTimeout(150)
  await expect(badge).toHaveText('2')
})

test('speed menu arrow keys navigate options', async ({ page }) => {
  await page.getByLabel('Playback speed').click()
  const menu = page.locator('.speed-wrapper [role="menu"]')
  const buttons = menu.locator('button')
  await buttons.first().focus()
  await page.keyboard.press('ArrowDown')
  await expect(buttons.nth(1)).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(buttons.first()).toBeFocused()
})
