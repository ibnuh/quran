import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify('test')
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.js'],
    globals: true
  }
})
