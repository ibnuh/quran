import { defineConfig } from 'vite'
import { execSync } from 'child_process'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

const SITE_ORIGIN = 'https://quran.ibnuhx.com'

// Emit a sitemap covering the home page and all 114 surah routes for crawlability.
function sitemapPlugin() {
  return {
    name: 'sitemap',
    generateBundle() {
      const urls = ['/'].concat(Array.from({ length: 114 }, (_, i) => `/${i + 1}`))
      const body = urls.map(u => `  <url><loc>${SITE_ORIGIN}${u}</loc></url>`).join('\n')
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: xml })
    }
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(commitHash)
  },
  plugins: [
    vue(),
    tailwindcss(),
    sitemapPlugin(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        // Auto-activate new workers so stuck clients (old update toast) can recover
        // on the next SW check without needing the previous build's apply path.
        // The client still shows a prompt via registerType: 'prompt', and reloads
        // on controllerchange in main.js / UpdatePrompt.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-woff2',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/verses\.quran\.foundation\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-fonts',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            // QCF v2 per-page mushaf glyph fonts.
            urlPattern: /^https:\/\/static\.qurancdn\.com\/fonts\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'qcf-page-fonts',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/api\.alquran\.cloud\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'quran-text-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /^https:\/\/api\.qurancdn\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'quran-audio-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 10
            }
          },
          {
            // quran.com text, translations, tajweed, and tafsir.
            urlPattern: /^https:\/\/api\.quran\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'quran-com-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Full-surah MP3s (qurancdn) and the verse.quran.com mirror.
            urlPattern: /^https:\/\/(download\.quranicaudio\.com|verses\.quran\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-audio-files',
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200, 206] },
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            // Per-verse MP3s (alquran.cloud fallback via islamic.network CDN).
            urlPattern: /^https:\/\/cdn\.islamic\.network\/quran\/audio\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-verse-audio-files',
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200, 206] },
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      },
      manifest: {
        name: 'Quran Player',
        short_name: 'Quran',
        description:
          'Read and listen to the Quran with word-by-word highlighting, 30+ reciters, and translations in 28 languages.',
        theme_color: '#1a6b4b',
        background_color: '#f8f6f1',
        display: 'standalone',
        start_url: '/',
        categories: ['education', 'lifestyle'],
        lang: 'en',
        dir: 'ltr',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ],
        shortcuts: [
          {
            name: 'Al-Faatiha',
            short_name: 'Faatiha',
            url: '/?surah=1',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Ya-Sin',
            short_name: 'Ya-Sin',
            url: '/?surah=36',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Al-Mulk',
            short_name: 'Mulk',
            url: '/?surah=67',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Al-Kahf',
            short_name: 'Kahf',
            url: '/?surah=18',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          }
        ]
      }
    })
  ]
})
