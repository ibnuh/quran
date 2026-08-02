import { chromium } from '@playwright/test'
const BASE = process.env.BASE_URL || 'http://localhost:5173'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.on('console', msg => {
  const t = msg.text()
  if (t.includes('[audio]') || t.includes('[playback]') || msg.type() === 'error') {
    console.log(msg.type()+':', t)
  }
})
console.log('goto cold')
await page.goto(`${BASE}/2/255`, { waitUntil: 'domcontentloaded', timeout: 60000 })
const playBtn = page.getByRole('button', { name: /^(Play|Pause)$/i }).first()
await playBtn.waitFor({ state: 'visible', timeout: 20000 })
for (let i = 0; i < 20; i++) {
  const disabled = await playBtn.isDisabled().catch(() => true)
  console.log('attempt', i, 'disabled', disabled)
  if (!disabled) {
    await playBtn.click()
    break
  }
  await page.waitForTimeout(150)
}
await page.waitForTimeout(5000)
const label = await page.getByRole('button', { name: /^(Play|Pause)$/i }).first().getAttribute('aria-label')
console.log('final', label)
await browser.close()
process.exit(label === 'Pause' ? 0 : 1)
