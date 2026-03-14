<script setup>
defineProps({
  surah: { type: Object, required: true }
})
</script>

<template>
  <div class="text-center pt-6 pb-4">
    <h2 class="font-arabic text-3xl sm:text-4xl font-bold text-primary-dark leading-relaxed">{{ surah.name }}</h2>
    <h3 class="text-base font-medium text-body mt-0.5">{{ surah.englishName }} - {{ surah.englishNameTranslation }}</h3>
    <p class="text-sm text-muted mt-1">{{ surah.revelationType }} | {{ surah.numberOfAyahs }} verses</p>
  </div>
</template>
