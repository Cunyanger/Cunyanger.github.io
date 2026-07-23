<template>
  <div v-if="visible" class="page-particle-backdrop" aria-hidden="true">
    <ParticleBackground track-window />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import ParticleBackground from './ParticleBackground.vue'

const route = useRoute()
const isMounted = ref(false)
const currentTheme = ref('light')

const visible = computed(
  () =>
    isMounted.value &&
    currentTheme.value === 'dark' &&
    (/^\/article\/[^/]+\.html$/.test(route.path) || route.path.startsWith('/article/')),
)

let stopWatching = () => {}
let themeObserver = null

const syncPageClass = (value) => {
  document.documentElement.classList.toggle('article-particles-enabled', value)
}

const syncTheme = () => {
  currentTheme.value = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

onMounted(() => {
  isMounted.value = true
  syncTheme()
  syncPageClass(visible.value)
  stopWatching = watch(visible, syncPageClass)
  themeObserver = new MutationObserver(syncTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
})

onBeforeUnmount(() => {
  stopWatching()
  themeObserver?.disconnect()
  syncPageClass(false)
})
</script>

<style scoped>
.page-particle-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    linear-gradient(120deg, rgba(248, 250, 252, 0.96), rgba(239, 246, 255, 0.9) 46%, rgba(240, 253, 250, 0.92)),
    linear-gradient(90deg, rgba(37, 99, 235, 0.08), rgba(245, 158, 11, 0.08));
}

:global([data-theme="dark"] .page-particle-backdrop) {
  background:
    linear-gradient(120deg, rgba(2, 6, 23, 0.98), rgba(15, 23, 42, 0.94) 46%, rgba(19, 78, 74, 0.86)),
    linear-gradient(90deg, rgba(37, 99, 235, 0.12), rgba(245, 158, 11, 0.06));
}

:global(.article-particles-enabled body),
:global(.article-particles-enabled .theme-container) {
  background: transparent;
}

:global(.article-particles-enabled .theme-container) {
  position: relative;
  z-index: 1;
}

:global(.article-particles-enabled .vp-navbar),
:global(.article-particles-enabled .vp-sidebar) {
  border-color: rgba(37, 99, 235, 0.1);
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(18px);
}

:global([data-theme="dark"].article-particles-enabled .vp-navbar),
:global([data-theme="dark"].article-particles-enabled .vp-sidebar) {
  border-color: rgba(148, 163, 184, 0.12);
  background: rgba(2, 6, 23, 0.18);
}

:global(.article-particles-enabled .vp-sidebar-links),
:global(.article-particles-enabled [vp-toc]) {
  background: transparent;
}

:global(.article-particles-enabled .vp-page [vp-content]:not(.custom)) {
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
}

:global([data-theme="dark"].article-particles-enabled .vp-page [vp-content]:not(.custom)) {
  border-color: rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.7);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.24);
}
</style>
