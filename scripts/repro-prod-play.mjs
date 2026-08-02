import { chromium } from '@playwright/test'
const BASE = 'https://quran.ibnuhx.com'
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()
const logs = []
page.on('console', m => {
  const t = m.text()
  if (/audio|playback|NotAllowed|play/i.test(t) || m.type() === 'error') {
    logs.push(m.type() + ': ' + t)
  }
})
await page.goto(BASE + '/39/6', { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(3000)
const playBtn = page.getByRole('button', { name: /^(Play|Pause)$/i }).first()
await playBtn.waitFor({ state: 'visible', timeout: 30000 })
console.log('disabled', await playBtn.isDisabled())
await playBtn.click()
await page.waitForTimeout(4000)
const label = await playBtn.getAttribute('aria-label')
console.log('label', label)
console.log('logs', logs.slice(-20))
// service worker controllers
const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker?.getRegistration()
  return {
    controlling: !!navigator.serviceWorker?.controller,
    scriptURL: navigator.serviceWorker?.controller?.scriptURL || null,
    waiting: !!reg?.waiting,
    active: reg?.active?.scriptURL || null
  }
})
console.log('sw', sw)
await browser.close()
process.exit(label === 'Pause' ? 0 : 1)
