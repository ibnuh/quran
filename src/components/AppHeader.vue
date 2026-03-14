<template>
  <header class="header">
    <h1 class="header-title">Quran Player</h1>
  </header>
</template>

<style scoped>
.header {
  background: var(--primary);
  color: #fff;
  padding: 1rem 1.5rem;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.header-title {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin: 0;
}

@media (max-width: 640px) {
  .header {
    padding: 0.75rem 1rem;
  }
  .header-title {
    font-size: 1.1rem;
  }
}
</style>
