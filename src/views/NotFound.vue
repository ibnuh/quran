<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="h-dvh flex flex-col items-center justify-center bg-surface text-center px-6">
    <h1 class="text-6xl font-bold text-primary mb-4">404</h1>
    <p class="text-lg text-body mb-2">Page not found</p>
    <p class="text-sm text-muted mb-8">The page you are looking for does not exist.</p>
    <button
      class="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
      @click="router.push('/')"
    >
      Go to Quran Player
    </button>
  </div>
</template>
