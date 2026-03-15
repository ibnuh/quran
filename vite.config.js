import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
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
          }
        ]
      },
      manifest: {
        name: 'Quran Player',
        short_name: 'Quran',
        description: 'Listen to and read the Quran with word-by-word highlighting',
        theme_color: '#1a6b4b',
        background_color: '#f8f6f1',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      }
    })
  ]
})
