<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { resolveThemeId } from '../data/themes.js'

// Lightweight on-device diagnostics overlay. Enable with ?debug=1 (persists in
// localStorage so it survives reloads in an installed PWA); disable with ?debug=0.
const store = usePlayerStore()
const probeRef = ref(null)
const info = ref({})
const copied = ref(false)
let timer = null

function refresh() {
  const meta = document.querySelector('meta[name="theme-color"]')
  info.value = {
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '(dev)',
    theme: store.theme,
    resolvedTheme: resolveThemeId(store.theme),
    metaThemeColor: meta ? meta.getAttribute('content') : '(none)',
    metaTagCount: document.querySelectorAll('meta[name="theme-color"]').length,
    displayStandalone: window.matchMedia('(display-mode: standalone)').matches,
    displayFullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
    iosStandalone: !!window.navigator.standalone,
    safeAreaTop: probeRef.value ? probeRef.value.offsetHeight + 'px' : '?',
    online: navigator.onLine,
    ua: navigator.userAgent.slice(0, 60)
  }
}

function copy() {
  navigator.clipboard
    .writeText(JSON.stringify(info.value, null, 2))
    .then(() => {
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 1500)
    })
    .catch(() => {})
}

function disable() {
  try {
    localStorage.removeItem('quran-debug')
  } catch {
    // ignore
  }
  window.location.reload()
}

onMounted(() => {
  refresh()
  timer = setInterval(refresh, 1000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div
    class="fixed left-2 right-2 z-[200] rounded-lg bg-black/85 text-green-300 text-[11px] leading-snug font-mono p-2 shadow-2xl pointer-events-none"
    style="bottom: max(0.5rem, env(safe-area-inset-bottom, 0px))"
  >
    <!-- Probe element to read the actual safe-area inset value -->
    <div
      ref="probeRef"
      style="height: env(safe-area-inset-top, 0px); width: 0; position: absolute"
    ></div>
    <div class="flex items-center justify-between mb-1 pointer-events-auto">
      <span class="text-green-400 font-bold">DEBUG</span>
      <span class="flex gap-2">
        <button class="underline" @click="copy">{{ copied ? 'copied' : 'copy' }}</button>
        <button class="underline" @click="refresh">refresh</button>
        <button class="underline text-red-300" @click="disable">close</button>
      </span>
    </div>
    <div v-for="(value, key) in info" :key="key" class="flex gap-2">
      <span class="text-green-500 shrink-0">{{ key }}:</span>
      <span class="text-green-200 break-all">{{ String(value) }}</span>
    </div>
  </div>
</template>
