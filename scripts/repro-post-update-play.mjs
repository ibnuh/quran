/**
 * Reproduce: after "update/reload" while mid-surah, Play does nothing until surah switch.
 *
 * Scenarios:
 *  A) Hard reload with restored prefs (verse index > 0), then Play
 *  B) After successful play, kill the media pipeline (simulates SW media death), Play again
 *  C) Same as B, then Next surah, then Play (user workaround)
 *
 * Usage: node scripts/repro-post-update-play.mjs
 * BASE_URL=http://localhost:5173
 */
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:5173'

async function collectAudioProbe(page) {
  return page.evaluate(() => {
    // Our Audio is not in the DOM. Expose last debug via window if present.
    return {
      title: document.title,
      playLabel: document
        .querySelector('button[aria-label="Play"], button[aria-label="Pause"]')
        ?.getAttribute('aria-label'),
      playDisabled: document.querySelector('button[aria-label="Play"]')?.disabled ?? null,
      chip: document.querySelector('[aria-label="Jump to verse"]')?.textContent?.trim() || null,
      header: document.querySelector('header p')?.textContent?.trim() || null,
      __audioDebug: window.__audioDebug || null
    }
  })
}

async function clickPlay(page) {
  const play = page.getByRole('button', { name: 'Play', exact: true })
  const pause = page.getByRole('button', { name: 'Pause', exact: true })
  if (await pause.count()) {
    console.log('already Pause')
    return 'Pause'
  }
  await play.waitFor({ state: 'visible', timeout: 20000 })
  const disabled = await play.isDisabled()
  console.log('Play disabled?', disabled)
  if (disabled) {
    return 'disabled'
  }
  await play.click()
  await page.waitForTimeout(2500)
  const label = await page
    .getByRole('button', { name: /^(Play|Pause)$/ })
    .first()
    .getAttribute('aria-label')
  return label
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const logs = []
  page.on('console', msg => {
    const t = msg.text()
    if (
      t.includes('[audio]') ||
      t.includes('[playback]') ||
      t.includes('[update]') ||
      msg.type() === 'error'
    ) {
      logs.push(`${msg.type()}: ${t}`)
      console.log(`  console.${msg.type()}:`, t.slice(0, 300))
    }
  })
  page.on('pageerror', e => console.log('  pageerror:', e.message))

  // ---- Scenario A: reload with mid-surah prefs (post-update restore) ----
  console.log('\n=== A: restore mid-surah prefs then Play ===')
  await page.goto(`${BASE}/?debugAudio=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.evaluate(() => {
    localStorage.setItem(
      'quran-player-prefs',
      JSON.stringify({
        version: 2,
        surah: 39,
        verse: 5, // ayah 6 (0-based index)
        reciter: 'alafasy',
        translation: 'en.sahih',
        readMode: false,
        readingMode: false
      })
    )
    localStorage.setItem('quran-debug-audio', '1')
  })
  await page.goto(`${BASE}/?debugAudio=1`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(3500)
  console.log('probe A before play', await collectAudioProbe(page))
  let labelA = await clickPlay(page)
  console.log('result A', labelA, await collectAudioProbe(page))

  // ---- Scenario B: kill media pipeline, Play without surah change ----
  console.log('\n=== B: kill media pipeline then Play (same surah) ===')
  // Ensure we have a known good play first if A failed, switch surah and back?
  // Instead force-kill whatever audio state exists via page evaluation hook.
  const killed = await page.evaluate(async () => {
    // Patch: if app exposed nothing, create a synthetic failure by
    // dispatching a fake SW controllerchange is not enough.
    // Monkeypatch: find and break HTMLMediaElement.prototype temporarily is too late.
    // Instead, call into a debug hook if present.
    if (typeof window.__forceKillAudio === 'function') {
      window.__forceKillAudio()
      return 'hook'
    }
    return 'no-hook'
  })
  console.log('kill method', killed)
  await page.waitForTimeout(300)
  // Pause first if playing so we click Play
  if ((await page.getByRole('button', { name: 'Pause', exact: true }).count()) > 0) {
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await page.waitForTimeout(300)
  }
  let labelB = await clickPlay(page)
  console.log('result B', labelB, await collectAudioProbe(page))

  // ---- Scenario C: next surah then Play (user workaround) ----
  console.log('\n=== C: Next surah then Play ===')
  if ((await page.getByRole('button', { name: 'Pause', exact: true }).count()) > 0) {
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
  }
  await page.getByLabel('Next surah').click()
  await page.waitForTimeout(3000)
  console.log('probe C after surah change', await collectAudioProbe(page))
  let labelC = await clickPlay(page)
  console.log('result C', labelC, await collectAudioProbe(page))

  // ---- Scenario D: simulate full "update apply" reload mid-session ----
  console.log('\n=== D: play, then location.reload (update reload), then Play ===')
  await page.goto(`${BASE}/39/6?debugAudio=1`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(3000)
  const beforeReload = await clickPlay(page)
  console.log('D playing before reload?', beforeReload)
  // Wait a bit as if listening
  await page.waitForTimeout(1500)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(3500)
  console.log('probe D after reload', await collectAudioProbe(page))
  const labelD = await clickPlay(page)
  console.log('result D', labelD, await collectAudioProbe(page))

  // If D failed, try next surah
  if (labelD !== 'Pause') {
    console.log('D failed — trying next surah workaround')
    await page.getByLabel('Next surah').click()
    await page.waitForTimeout(3000)
    const labelD2 = await clickPlay(page)
    console.log('result D after surah switch', labelD2)
  }

  console.log('\n=== SUMMARY ===')
  console.log({ A: labelA, B: labelB, C: labelC, D: labelD })
  console.log('log count', logs.length)

  await browser.close()

  // Fail if A or D cannot play (the post-update restore paths)
  if (labelA !== 'Pause' || labelD !== 'Pause') {
    process.exitCode = 1
    console.error('REPRODUCED or still broken: post-update play failed')
  } else {
    console.log('Could not reproduce failure with these scenarios (play worked)')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
