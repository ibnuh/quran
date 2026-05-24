import { test, expect, mockApi, waitForSurahLoad } from './fixtures.js'

test('extra translations are stacked under the primary translation', async ({ page }) => {
  mockApi(page)
  // The extra-translations fetch requests a single edition (no quran-uthmani prefix);
  // return a recognizable edition for it, and let the primary fetch fall through.
  await page.route(/api\.alquran\.cloud\/v1\/surah\/\d+\/editions\//, route => {
    const url = route.request().url()
    if (url.includes('en.pickthall') && !url.includes('quran-uthmani')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          data: [
            {
              edition: { identifier: 'en.pickthall', englishName: 'Pickthall' },
              ayahs: Array.from({ length: 7 }, (_, i) => ({
                numberInSurah: i + 1,
                text: 'Pickthall verse ' + (i + 1)
              }))
            }
          ]
        })
      })
    } else {
      route.fallback()
    }
  })

  await page.goto('/')
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('quran-player-prefs') || '{}')
    prefs.extraTranslations = ['en.pickthall']
    localStorage.setItem('quran-player-prefs', JSON.stringify(prefs))
  })
  await page.reload()
  await waitForSurahLoad(page)

  await expect(page.getByText('Pickthall verse 1')).toBeVisible()
})
