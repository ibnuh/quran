import { test, expect, mockApi, waitForSurahLoad, installMockAudio } from './fixtures.js'

const STORAGE_KEY = 'quran-player-prefs'

function mockQuranComWithFootnotes(page) {
  // Chapter text + translation with footnote markers (Saheeh via resource 20).
  page.route(/api\.quran\.com\/api\/v4\/verses\/by_chapter\//, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verses: [
          {
            verse_number: 1,
            text_uthmani: '\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650',
            translations: [
              {
                text: 'In the name of Allah,<sup foot_note=195932>1</sup> the Entirely Merciful.<sup foot_note=195931>2</sup>'
              }
            ]
          },
          {
            verse_number: 2,
            text_uthmani: '\u0627\u0644\u0652\u062d\u064e\u0645\u0652\u062f\u064f',
            translations: [{ text: 'All praise is due to Allah.' }]
          },
          {
            verse_number: 3,
            text_uthmani: '\u0627\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646\u0650',
            translations: [{ text: 'The Entirely Merciful.' }]
          },
          {
            verse_number: 4,
            text_uthmani: '\u0645\u064e\u0627\u0644\u0650\u0643\u0650',
            translations: [{ text: 'Sovereign of the Day of Recompense.' }]
          },
          {
            verse_number: 5,
            text_uthmani: '\u0625\u0650\u064a\u0651\u064e\u0627\u0643\u064e',
            translations: [{ text: 'It is You we worship.' }]
          },
          {
            verse_number: 6,
            text_uthmani: '\u0627\u0647\u0652\u062f\u0650\u0646\u064e\u0627',
            translations: [{ text: 'Guide us to the straight path.' }]
          },
          {
            verse_number: 7,
            text_uthmani: '\u0635\u0650\u0631\u064e\u0627\u0637\u064e',
            translations: [{ text: 'The path of those You favored.' }]
          }
        ]
      })
    })
  })

  page.route(/api\.quran\.com\/api\/v4\/foot_notes\/195932/, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        foot_note: {
          id: 195932,
          text: 'Allah is a proper name referring to the Lord of all existence.',
          language_name: 'english'
        }
      })
    })
  })

  page.route(/api\.quran\.com\/api\/v4\/foot_notes\/195931/, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        foot_note: {
          id: 195931,
          text: 'Ar-Rahman and Ar-Raheem are two names of Allah derived from mercy.',
          language_name: 'english'
        }
      })
    })
  })
}

async function startWithSahih(page) {
  mockApi(page)
  await installMockAudio(page)
  mockQuranComWithFootnotes(page)
  await page.goto('/')
  await page.evaluate(
    ([key, prefs]) => {
      localStorage.setItem(key, JSON.stringify(prefs))
    },
    [
      STORAGE_KEY,
      {
        version: 2,
        translation: 'en.sahih',
        surah: 1,
        verse: 0,
        showFootnotes: true
      }
    ]
  )
  await page.reload()
  await waitForSurahLoad(page)
}

test('footnote marker opens a sheet with note text', async ({ page }) => {
  await startWithSahih(page)

  const marker = page.getByRole('button', { name: 'Footnote 1' })
  await expect(marker).toBeVisible()
  await marker.click()

  const dialog = page.getByRole('dialog', { name: 'Footnotes' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Note 1 of 2')
  await expect(
    dialog.getByText('Allah is a proper name referring to the Lord of all existence.')
  ).toBeVisible()
})

test('footnote panel can switch between notes on the same verse', async ({ page }) => {
  await startWithSahih(page)

  await page.getByRole('button', { name: 'Footnote 1' }).click()
  const dialog = page.getByRole('dialog', { name: 'Footnotes' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Note 1 of 2')

  // Next/prev cycle notes within the verse.
  await dialog.getByLabel('Next footnote').click()
  await expect(dialog).toContainText('Note 2 of 2')
  await expect(
    dialog.getByText('Ar-Rahman and Ar-Raheem are two names of Allah derived from mercy.')
  ).toBeVisible()

  await dialog.getByLabel('Previous footnote').click()
  await expect(dialog).toContainText('Note 1 of 2')
})

test('arrow keys cycle footnotes without changing the verse', async ({ page }) => {
  await startWithSahih(page)

  await page.getByRole('button', { name: 'Footnote 1' }).click()
  const dialog = page.getByRole('dialog', { name: 'Footnotes' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Note 1 of 2')

  // Stay on verse 1 of Al-Fatiha while cycling notes.
  await page.keyboard.press('ArrowRight')
  await expect(dialog).toContainText('Note 2 of 2')
  await expect(dialog).toBeVisible()
  await expect(page.locator('.verse-translation')).toContainText('In the name of Allah')

  await page.keyboard.press('ArrowLeft')
  await expect(dialog).toContainText('Note 1 of 2')
  await expect(page.locator('.verse-translation')).toContainText('In the name of Allah')
})

test('clicking outside the sheet closes footnotes', async ({ page }) => {
  await startWithSahih(page)

  await page.getByRole('button', { name: 'Footnote 1' }).click()
  await expect(page.getByRole('dialog', { name: 'Footnotes' })).toBeVisible()
  // Backdrop is visual-only; outside clicks hit page content and close via the pointer handler.
  await page.locator('header').first().click({ position: { x: 8, y: 8 } })
  await expect(page.getByRole('dialog', { name: 'Footnotes' })).toHaveCount(0)
})

test('footnote panel can be closed', async ({ page }) => {
  await startWithSahih(page)

  await page.getByRole('button', { name: 'Footnote 1' }).click()
  const dialog = page.getByRole('dialog', { name: 'Footnotes' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Close footnote').click()
  await expect(dialog).toHaveCount(0)
})

test('tapping the same footnote marker again closes the sheet', async ({ page }) => {
  await startWithSahih(page)

  const marker = page.locator('.fn-marker').filter({ hasText: '1' }).first()
  await marker.click()
  await expect(page.getByRole('dialog', { name: 'Footnotes' })).toBeVisible()
  await marker.click()
  await expect(page.getByRole('dialog', { name: 'Footnotes' })).toHaveCount(0)
})

test('verses without footnotes show plain translation', async ({ page }) => {
  await startWithSahih(page)

  await page.getByRole('button', { name: 'Next verse' }).click()
  await expect(page.getByRole('button', { name: /Footnote/ })).toHaveCount(0)
  await expect(page.locator('.verse-translation')).toContainText('All praise is due to Allah.')
})

test('footnotes can be disabled in settings', async ({ page }) => {
  await startWithSahih(page)

  await expect(page.getByRole('button', { name: 'Footnote 1' })).toBeVisible()

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Settings' })
  // Footnotes live on the Reading tab after the settings IA split.
  await modal.getByRole('tab', { name: 'Reading' }).click()
  const footnotesToggle = modal.locator('label', { hasText: 'Translation footnotes' })
  await footnotesToggle.scrollIntoViewIfNeeded()
  await footnotesToggle.locator('input[type="checkbox"]').uncheck()
  await modal.getByLabel('Close settings').click()

  await expect(page.getByRole('button', { name: /Footnote/ })).toHaveCount(0)
  await expect(page.locator('.verse-translation')).toContainText('In the name of Allah')
})
