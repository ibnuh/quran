<script setup>
defineProps({
  surah: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="surah-header">
    <h2 class="surah-name-arabic">{{ surah.name }}</h2>
    <h3 class="surah-name-english">{{ surah.englishName }} - {{ surah.englishNameTranslation }}</h3>
    <p class="surah-info">{{ surah.revelationType }} | {{ surah.numberOfAyahs }} verses</p>
  </div>
</template>

<style scoped>
.surah-header {
  text-align: center;
  padding: 1.5rem 0 1rem;
}

.surah-name-arabic {
  font-family: 'Amiri', serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-dark);
  line-height: 1.4;
  margin: 0;
}

.surah-name-english {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text);
  margin: 0.15rem 0 0;
}

.surah-info {
  font-size: 0.8rem;
  color: var(--text-light);
  margin: 0.25rem 0 0;
}

@media (max-width: 640px) {
  .surah-name-arabic {
    font-size: 1.6rem;
  }
}
</style>
