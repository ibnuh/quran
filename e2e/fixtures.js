import { test as base, expect } from '@playwright/test'

const STORAGE_KEY = 'quran-player-prefs'

/**
 * Install a deterministic HTMLAudioElement mock before any app code runs.
 * Real MP3 fetches are aborted in mockApi; without this, play() never becomes Pause.
 * Duration is 70s so verse timings at 0..60s stay in range.
 */
export async function installMockAudio(page) {
  await page.addInitScript(() => {
    class MockAudio extends EventTarget {
      constructor() {
        super()
        this.src = ''
        this.currentSrc = ''
        this._currentTime = 0
        this.duration = 70
        this.paused = true
        this.playbackRate = 1
        this.volume = 1
        this.muted = false
        this.preload = 'auto'
        this.readyState = 0
        this.networkState = 0
        this.error = null
        this._timer = null
        this._loadTimer = null
        this.buffered = {
          length: 1,
          start: () => 0,
          end: () => 70
        }
      }

      get currentTime() {
        return this._currentTime
      }

      set currentTime(value) {
        if (!Number.isFinite(value)) {
          return
        }
        this.dispatchEvent(new Event('seeking'))
        this._currentTime = Math.max(0, Math.min(this.duration || value, value))
        queueMicrotask(() => this.dispatchEvent(new Event('seeked')))
      }

      load() {
        if (!this.src) {
          clearTimeout(this._loadTimer)
          this._loadTimer = null
          this.readyState = 0
          this.networkState = 0
          return
        }
        clearTimeout(this._loadTimer)
        this.currentSrc = this.src
        this.networkState = 2
        this.error = null
        this.dispatchEvent(new Event('loadstart'))

        const finish = () => {
          this._loadTimer = null
          this.networkState = 1
          this.readyState = 4
          this.duration = 70
          this.dispatchEvent(new Event('loadedmetadata'))
          this.dispatchEvent(new Event('canplay'))
          this.dispatchEvent(new Event('progress'))
        }
        const delay = Number(window.__mockAudioLoadDelayMs) || 0
        if (delay > 0) {
          this.readyState = 0
          this._loadTimer = setTimeout(finish, delay)
        } else {
          this.readyState = 4
          queueMicrotask(finish)
        }
      }

      play() {
        if (!this.src && !this.currentSrc) {
          return Promise.reject(new DOMException('No src', 'NotSupportedError'))
        }
        if (this.readyState < 1 && this.networkState !== 2) {
          this.load()
        }
        this.paused = false
        this.dispatchEvent(new Event('play'))
        const shouldFail = Boolean(window.__mockAudioFailNextPlay)
        window.__mockAudioFailNextPlay = false
        const startPlayback = () => {
          if (this.paused) {
            return
          }
          this.dispatchEvent(new Event('playing'))
          if (this._timer) {
            clearInterval(this._timer)
          }
          this._timer = setInterval(() => {
            if (this.paused) {
              return
            }
            this._currentTime = Math.min(this.duration, this._currentTime + 0.25)
            this.dispatchEvent(new Event('timeupdate'))
            if (this._currentTime >= this.duration) {
              this.paused = true
              clearInterval(this._timer)
              this._timer = null
              this.dispatchEvent(new Event('ended'))
            }
          }, 250)
        }
        if (this.readyState < 3) {
          return new Promise((resolve, reject) => {
            this.addEventListener(
              'canplay',
              () => {
                if (shouldFail) {
                  this.paused = true
                  this.dispatchEvent(new Event('pause'))
                  reject(new DOMException('Mock startup failure', 'AbortError'))
                  return
                }
                startPlayback()
                resolve()
              },
              { once: true }
            )
          })
        }
        if (shouldFail) {
          this.paused = true
          this.dispatchEvent(new Event('pause'))
          return Promise.reject(new DOMException('Mock startup failure', 'AbortError'))
        }
        startPlayback()
        return Promise.resolve()
      }

      pause() {
        this.paused = true
        if (this._timer) {
          clearInterval(this._timer)
          this._timer = null
        }
        this.dispatchEvent(new Event('pause'))
      }

      removeAttribute(name) {
        if (name === 'src') {
          this.src = ''
          this.currentSrc = ''
        }
      }
    }

    window.Audio = MockAudio
  })
}

export function mockApi(page) {
  // Mock alquran.cloud: /v1/surah/{num}/editions/{editions}
  page.route(/api\.alquran\.cloud\/v1\/surah/, route => {
    const ayahs = Array.from({ length: 7 }, (_, i) => ({
      numberInSurah: i + 1,
      text: `آيَةُ الْآيَةِ ${i + 1}`
    }))
    const translationAyahs = Array.from({ length: 7 }, (_, i) => ({
      numberInSurah: i + 1,
      text: `This is verse ${i + 1}`
    }))
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        data: [
          { edition: { identifier: 'quran-uthmani' }, ayahs },
          { edition: { identifier: 'en.itani' }, ayahs: translationAyahs }
        ]
      })
    })
  })

  // Mock quran.com (default English is en.sahih, which routes here).
  page.route(/api\.quran\.com\/api\/v4\/verses\/by_chapter\//, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verses: Array.from({ length: 7 }, (_, i) => ({
          verse_number: i + 1,
          text_uthmani: `آيَةُ الْآيَةِ ${i + 1}`,
          translations: [{ text: `This is verse ${i + 1}` }]
        }))
      })
    })
  })

  page.route(/api\.quran\.com\/api\/v4\/foot_notes\//, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        foot_note: { id: 1, text: 'Mock footnote.', language_name: 'english' }
      })
    })
  })

  // Mock qurancdn.com full-surah audio metadata.
  // duration is milliseconds (matches live API); verse timestamps are also ms.
  page.route(/api\.qurancdn\.com/, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        audio_files: [
          {
            // Must use an allowlisted audio host (see ALLOWED_AUDIO_HOSTS in config.js).
            audio_url: 'https://download.quranicaudio.com/quran/mock/001.mp3',
            duration: 70000,
            verse_timings: Array.from({ length: 7 }, (_, i) => ({
              verse_key: `1:${i + 1}`,
              timestamp_from: i * 10000,
              timestamp_to: (i + 1) * 10000,
              segments: []
            }))
          }
        ]
      })
    })
  })

  // MP3 bytes are unused when installMockAudio is active; abort keeps network quiet.
  page.route(/\.mp3/, route => route.abort())
  page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort())
}

export async function waitForSurahLoad(page) {
  await page.waitForFunction(
    () => {
      const loading = document.querySelector('.skeleton-container')
      const verse = document.querySelector('.verse-arabic')
      const error = document.querySelector('.error-state')
      return (!loading && verse) || error
    },
    { timeout: 30000 }
  )
}

// Navigate, clear any stale prefs, reload, wait for surah
export async function startFresh(page) {
  await installMockAudio(page)
  await page.goto('/')
  await page.evaluate(key => localStorage.removeItem(key), STORAGE_KEY)
  await page.reload()
  await waitForSurahLoad(page)
}

export function playButton(page) {
  return page.getByRole('button', { name: 'Play', exact: true })
}

export function pauseButton(page) {
  return page.getByRole('button', { name: 'Pause', exact: true })
}

export function verseBadge(page) {
  return page.locator('.verse-badge').first()
}

/** Verse chip text is now "1 / 7" (not "Verse 1 of 7"). */
export function jumpVerseButton(page) {
  return page.getByLabel('Jump to verse')
}

export function expectVerseChip(page, current, total = 7) {
  return expect(jumpVerseButton(page)).toContainText(new RegExp(`${current}\\s*/\\s*${total}`))
}

export const test = base
export { expect }
