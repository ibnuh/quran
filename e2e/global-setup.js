import { chromium } from '@playwright/test'

export default async function globalSetup() {
  // Obscura CDP endpoint - set env var for test to use
  process.env.OBSCURA_WS = 'ws://127.0.0.1:9222/devtools/browser'
  console.log('Obscura CDP server expected at:', process.env.OBSCURA_WS)
  console.log('Make sure obscura serve --port 9222 is running')
}
