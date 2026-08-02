/**
 * Local repro: load the app, jump to ayah 6, click Play, report audio state.
 * Usage: node scripts/repro-play.mjs
 */
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:5173'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const logs = []
  page.on('console', msg => {
    const text = msg.text()
    if (
      text.includes('[audio]') ||
      text.includes('[playback]') ||
      msg.type() === 'error' ||
      msg.type() === 'warning'
    ) {
      logs.push(`[${msg.type()}] ${text}`)
      console.log(`console.${msg.type()}:`, text)
    }
  })
  page.on('pageerror', err => {
    logs.push(`[pageerror] ${err.message}`)
    console.log('pageerror:', err.message)
  })

  console.log('goto', `${BASE}/39/6`)
  await page.goto(`${BASE}/39/6`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)

  const stateBefore = await page.evaluate(() => {
    const prefs = localStorage.getItem('quran-player-prefs')
    return {
      prefs: prefs ? JSON.parse(prefs) : null,
      title: document.title
    }
  })
  console.log('before', stateBefore)

  // Find the main play button by aria-label Play or Pause
  const playBtn = page.getByRole('button', { name: /^(Play|Pause)$/i }).first()
  await playBtn.waitFor({ state: 'visible', timeout: 15000 })
  const disabled = await playBtn.isDisabled()
  console.log('play button disabled?', disabled)

  await playBtn.click()
  await page.waitForTimeout(3000)

  const after = await page.evaluate(() => {
    // Probe any audio elements (our useAudio uses new Audio(), not in DOM)
    return {
      label: document.querySelector('button[aria-label="Play"], button[aria-label="Pause"]')
        ?.getAttribute('aria-label'),
      timeLabels: Array.from(document.querySelectorAll('.tabular-nums, [class*="tabular"]'))
        .slice(0, 6)
        .map(el => el.textContent)
    }
  })
  console.log('after click', after)

  // Second click if still Play
  const stillPlay = await page.getByRole('button', { name: /^Play$/i }).count()
  console.log('still shows Play count', stillPlay)

  if (stillPlay > 0) {
    console.log('retry click')
    await page.getByRole('button', { name: /^Play$/i }).first().click()
    await page.waitForTimeout(3000)
  }

  const finalLabel = await page
    .getByRole('button', { name: /^(Play|Pause)$/i })
    .first()
    .getAttribute('aria-label')
  console.log('final button label', finalLabel)
  console.log('--- logs ---')
  logs.forEach(l => console.log(l))

  await browser.close()
  if (finalLabel !== 'Pause') {
    process.exitCode = 1
    console.error('FAIL: play did not start')
  } else {
    console.log('OK: playing')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
