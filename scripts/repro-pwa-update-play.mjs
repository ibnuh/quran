/**
 * Local-only repro: real PWA Update toast click while mid-surah, then Play.
 *
 * Flow:
 *  1. Serve dist-old (build A) via a static server with SW
 *  2. Open /39/6, wait for load, click Play (should work)
 *  3. Hot-swap served files to dist-new (build B) so SW finds an update
 *  4. Force registration.update(), wait for "Update available" toast
 *  5. Click Update
 *  6. After reload, click Play and report whether it becomes Pause
 *  7. If Play fails, click Next surah then Play (user workaround)
 *
 * Run:
 *   node scripts/repro-pwa-update-play.mjs
 *
 * Does not push or deploy.
 */
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync
} from 'node:fs'
import { join } from 'node:path'
import http from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { extname } from 'node:path'

const ROOT = process.cwd()
const PORT = 4177
const OLD_DIR = join(ROOT, 'dist-repro-old')
const NEW_DIR = join(ROOT, 'dist-repro-new')
const ACTIVE_DIR = join(ROOT, 'dist-repro-active')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg'
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: false,
      ...opts
    })
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))
      }
    })
  })
}

function copyDir(src, dest) {
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  cpSync(src, dest, { recursive: true })
}

function stampBuild(dir, stamp) {
  // Mutate sw.js precache revision for index.html so SW sees a real update.
  const swPath = join(dir, 'sw.js')
  if (!existsSync(swPath)) {
    throw new Error('sw.js missing — build with PWA enabled')
  }
  let sw = readFileSync(swPath, 'utf8')
  // Append a unique comment so bytes differ even if plugin already hashed.
  sw = sw.replace(/$/, `\n// repro-stamp:${stamp}\n`)
  // Also bump index.html revision string if present.
  sw = sw.replace(
    /("url":"index\.html","revision":")([^"]+)(")/,
    `$1${stamp}$3`
  )
  writeFileSync(swPath, sw)
  // Touch a tiny marker file referenced nowhere, just to change folder identity.
  writeFileSync(join(dir, `repro-${stamp}.txt`), stamp)
}

function startStaticServer(rootDirRef) {
  // rootDirRef is { dir: string } so we can hot-swap the served tree.
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)
      let pathname = decodeURIComponent(url.pathname)
      if (pathname.endsWith('/')) {
        pathname += 'index.html'
      }
      let filePath = join(rootDirRef.dir, pathname)
      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        // SPA fallback
        filePath = join(rootDirRef.dir, 'index.html')
      }
      const ext = extname(filePath)
      const type = MIME[ext] || 'application/octet-stream'
      res.setHeader('Content-Type', type)
      // Never cache SW / HTML during repro so updates are discoverable.
      if (pathname.endsWith('sw.js') || pathname.endsWith('index.html') || pathname.endsWith('.webmanifest')) {
        res.setHeader('Cache-Control', 'no-cache')
      } else {
        res.setHeader('Cache-Control', 'no-store')
      }
      // Service workers need correct scope headers.
      if (pathname.endsWith('sw.js')) {
        res.setHeader('Service-Worker-Allowed', '/')
      }
      createReadStream(filePath).pipe(res)
    } catch (e) {
      res.statusCode = 500
      res.end(String(e))
    }
  })
  return new Promise(resolve => {
    server.listen(PORT, '127.0.0.1', () => resolve(server))
  })
}

async function waitForUrl(url, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        return
      }
    } catch {
      // retry
    }
    await new Promise(r => setTimeout(r, 250))
  }
  throw new Error(`timeout waiting for ${url}`)
}

async function main() {
  console.log('=== Build A (old) ===')
  await run('npm', ['run', 'build'])
  copyDir(join(ROOT, 'dist'), OLD_DIR)
  stampBuild(OLD_DIR, `old-${Date.now()}`)

  console.log('=== Build B (new) — mutate source stamp then rebuild ===')
  // Tiny no-op change so assets hash differently: append to a CSS comment via env not needed;
  // rebuilding alone may produce same hashes if nothing changed. Force a stamp in index via build.
  // Safer: rebuild and then stamp sw + inject a unique string into index.html.
  await run('npm', ['run', 'build'])
  copyDir(join(ROOT, 'dist'), NEW_DIR)
  stampBuild(NEW_DIR, `new-${Date.now()}`)
  // Ensure index.html differs too (revision + content).
  const newIndex = join(NEW_DIR, 'index.html')
  writeFileSync(
    newIndex,
    readFileSync(newIndex, 'utf8') + `\n<!-- repro-new ${Date.now()} -->\n`
  )

  // Start serving OLD
  copyDir(OLD_DIR, ACTIVE_DIR)
  const rootRef = { dir: ACTIVE_DIR }
  const server = await startStaticServer(rootRef)
  const BASE = `http://127.0.0.1:${PORT}`
  await waitForUrl(BASE + '/')
  console.log('serving', BASE, 'from', rootRef.dir)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const logs = []
  page.on('console', msg => {
    const t = msg.text()
    if (
      t.includes('[audio]') ||
      t.includes('[playback]') ||
      t.includes('update') ||
      t.includes('SW') ||
      msg.type() === 'error'
    ) {
      logs.push(`${msg.type()}: ${t}`)
      console.log(`  console.${msg.type()}:`, t.slice(0, 280))
    }
  })
  page.on('pageerror', e => console.log('  pageerror:', e.message))

  console.log('\n=== 1) Open old build mid-surah, Play ===')
  await page.goto(`${BASE}/39/6?debugAudio=1`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  // Ensure SW controls the page
  await page.waitForTimeout(2000)
  const sw1 = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration()
    // Wait for controller
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })
        setTimeout(resolve, 3000)
      })
    }
    return {
      controller: navigator.serviceWorker.controller?.scriptURL || null,
      active: reg?.active?.scriptURL || null,
      waiting: !!reg?.waiting
    }
  })
  console.log('SW before update', sw1)

  // Wait for surah UI
  await page.getByRole('button', { name: /^(Play|Pause)$/ }).first().waitFor({
    state: 'visible',
    timeout: 30000
  })
  // Play once to confirm audio works on old build
  const playBtn = page.getByRole('button', { name: 'Play', exact: true })
  if (await playBtn.count()) {
    await playBtn.click()
    await page.waitForTimeout(2000)
  }
  let label = await page
    .getByRole('button', { name: /^(Play|Pause)$/ })
    .first()
    .getAttribute('aria-label')
  console.log('old build play result:', label)
  if (label === 'Pause') {
    // pause so post-update starts from Play
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await page.waitForTimeout(300)
  }

  // Persist mid-surah prefs explicitly
  await page.evaluate(() => {
    const key = 'quran-player-prefs'
    const prefs = JSON.parse(localStorage.getItem(key) || '{}')
    prefs.surah = 39
    prefs.verse = 5
    prefs.version = prefs.version || 2
    localStorage.setItem(key, JSON.stringify(prefs))
    localStorage.setItem('quran-debug-audio', '1')
  })

  console.log('\n=== 2) Swap to NEW build on disk ===')
  copyDir(NEW_DIR, ACTIVE_DIR)
  rootRef.dir = ACTIVE_DIR
  console.log('active dir now NEW')

  console.log('\n=== 3) Force SW update check ===')
  // Trigger update from the page
  const updateFound = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) {
      return { ok: false, reason: 'no registration' }
    }
    await reg.update()
    // Poll for waiting worker
    for (let i = 0; i < 40; i++) {
      if (reg.waiting) {
        return { ok: true, waiting: true }
      }
      // Some browsers put new SW in installing first
      if (reg.installing) {
        await new Promise(r => {
          reg.installing.addEventListener('statechange', () => r(), { once: true })
          setTimeout(r, 500)
        })
      } else {
        await new Promise(r => setTimeout(r, 250))
        await reg.update()
      }
    }
    return {
      ok: !!reg.waiting,
      waiting: !!reg.waiting,
      installing: !!reg.installing,
      active: reg.active?.scriptURL || null
    }
  })
  console.log('updateFound', updateFound)

  // Also dispatch the app's custom event if toast uses it and onNeedRefresh didn't fire
  // in this static-serve setup. Prefer real toast if present.
  await page.waitForTimeout(1000)
  let toastVisible = await page
    .getByRole('status')
    .filter({ hasText: /Update available|Updating/i })
    .count()
  console.log('toast visible count', toastVisible)

  if (!toastVisible) {
    console.log('toast not shown via onNeedRefresh — synthesizing sw-update-available')
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      const updateSW = async reloadPage => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
        if (reloadPage) {
          await new Promise(resolve => {
            let done = false
            const finish = () => {
              if (done) {
                return
              }
              done = true
              resolve()
            }
            navigator.serviceWorker.addEventListener('controllerchange', finish, { once: true })
            setTimeout(finish, 2000)
          })
          window.location.reload()
        }
      }
      window.dispatchEvent(
        new CustomEvent('sw-update-available', { detail: { updateSW } })
      )
    })
    await page.waitForTimeout(800)
    toastVisible = await page
      .getByRole('status')
      .filter({ hasText: /Update available|Updating/i })
      .count()
    console.log('toast after synthesize', toastVisible)
  }

  console.log('\n=== 4) Click Update ===')
  // Mirror production UpdatePrompt: clear audio caches + mark boot recovery before SW swap.
  await page.evaluate(async () => {
    try {
      sessionStorage.setItem('quran-sw-just-updated', '1')
      const keys = await caches.keys()
      for (const name of keys) {
        if (name.includes('quran-audio') || name.includes('quran-verse-audio')) {
          await caches.delete(name)
        }
      }
    } catch {
      // ignore
    }
  })
  const updateBtn = page.getByRole('button', { name: /^Update$/i })
  if ((await updateBtn.count()) === 0) {
    console.error('No Update button — cannot complete real update flow')
    // Fallback: manual SKIP_WAITING + reload like UpdatePrompt
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
      await new Promise(r => setTimeout(r, 500))
      location.reload()
    })
  } else {
    await updateBtn.click()
  }

  // Wait for navigation/reload
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(4000)

  console.log('\n=== 5) After update reload — probe + Play ===')
  const probe = await page.evaluate(() => ({
    title: document.title,
    href: location.href,
    chip: document.querySelector('[aria-label="Jump to verse"]')?.textContent?.trim(),
    playLabel: document
      .querySelector('button[aria-label="Play"], button[aria-label="Pause"]')
      ?.getAttribute('aria-label'),
    playDisabled: document.querySelector('button[aria-label="Play"]')?.disabled ?? null,
    sw: navigator.serviceWorker.controller?.scriptURL || null,
    snap: window.__getAudioSnapshot?.() || window.__audioDebug || null
  }))
  console.log('probe after update', probe)

  // Ensure debug on
  await page.evaluate(() => localStorage.setItem('quran-debug-audio', '1'))

  // Wait for play button
  await page.getByRole('button', { name: /^(Play|Pause)$/ }).first().waitFor({
    state: 'visible',
    timeout: 30000
  })
  if ((await page.getByRole('button', { name: 'Pause', exact: true }).count()) > 0) {
    console.log('already playing after update (unexpected)')
  }
  const play2 = page.getByRole('button', { name: 'Play', exact: true })
  if (await play2.count()) {
    console.log('clicking Play after update…')
    await play2.click()
    await page.waitForTimeout(3500)
  }
  const afterPlay = await page.evaluate(() => ({
    playLabel: document
      .querySelector('button[aria-label="Play"], button[aria-label="Pause"]')
      ?.getAttribute('aria-label'),
    chip: document.querySelector('[aria-label="Jump to verse"]')?.textContent?.trim(),
    snap: window.__getAudioSnapshot?.() || window.__audioDebug || null
  }))
  console.log('after Play', afterPlay)

  let postUpdatePlay = afterPlay.playLabel
  if (postUpdatePlay !== 'Pause') {
    console.log('\n=== 6) Workaround: Next surah then Play ===')
    await page.getByLabel('Next surah').click()
    await page.waitForTimeout(3500)
    const play3 = page.getByRole('button', { name: 'Play', exact: true })
    if (await play3.count()) {
      await play3.click()
      await page.waitForTimeout(2500)
    }
    const afterSwitch = await page.evaluate(() => ({
      playLabel: document
        .querySelector('button[aria-label="Play"], button[aria-label="Pause"]')
        ?.getAttribute('aria-label'),
      title: document.title,
      snap: window.__getAudioSnapshot?.() || null
    }))
    console.log('after surah switch Play', afterSwitch)
  }

  console.log('\n=== RESULT ===')
  console.log({
    postUpdatePlay,
    reproduced: postUpdatePlay !== 'Pause'
  })

  await browser.close()
  server.close()

  if (postUpdatePlay !== 'Pause') {
    console.error('REPRODUCED: Play dead after Update until surah switch')
    process.exitCode = 1
  } else {
    console.log('Could not reproduce with this local SW update harness')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
