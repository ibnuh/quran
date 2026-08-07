import { test, expect, mockApi, startFresh } from './fixtures.js'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  mockApi(page)
  await startFresh(page)
})

function ids(violations) {
  return violations.map(v => `${v.id} (${v.nodes.length})`)
}

test('main view has no WCAG 2 A/AA violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(ids(results.violations)).toEqual([])
})

test('settings dialog has no WCAG 2 A/AA violations', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  // Wait for the open animation to settle so opacity-based false positives clear.
  await page.waitForTimeout(600)
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(ids(results.violations)).toEqual([])
})
