<script setup lang="ts">
import SwissArmyKnife from './components/SwissArmyKnife.vue'
</script>

<template>
  <div class="page">
    <header class="masthead">
      <span class="badge">CV · Multi-Tool</span>
      <p class="kicker">A résumé you can open up</p>
    </header>

    <main class="main">
      <SwissArmyKnife />
    </main>

    <footer class="foot">
      <span>Built with Vue 3 + Vite · SVG, no 3D engine.</span>
    </footer>
  </div>
</template>

<style scoped>
.page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: clamp(18px, 4vw, 48px);
  gap: clamp(20px, 4vh, 48px);
}
.masthead {
  display: flex;
  align-items: center;
  gap: 16px;
}
.badge {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #fff;
  background: linear-gradient(180deg, #ff5b52, #c11510);
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 700;
}
.kicker {
  margin: 0;
  color: #8b93a0;
  font-size: 0.9rem;
}
.main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.foot {
  color: #6d7683;
  font-size: 0.8rem;
  text-align: center;
}
</style>
