<template>
  <div v-if="enabled" class="global-particle-backdrop" aria-hidden="true">
    <ParticleBackground track-window />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import ParticleBackground from "./ParticleBackground.vue";

const route = useRoute();
const enabled = ref(false);
const currentTheme = ref("light");
const isArticleIndex = computed(() => route.path.startsWith("/article/"));

let mediaQuery = null;
let themeObserver = null;
let stopWatchingRoute = () => {};

const syncVisible = () => {
  enabled.value =
    isArticleIndex.value && !mediaQuery?.matches && currentTheme.value !== "dark";
};

const syncTheme = () => {
  currentTheme.value =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  syncVisible();
};

onMounted(() => {
  mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  syncTheme();
  stopWatchingRoute = watch(isArticleIndex, syncVisible);
  mediaQuery.addEventListener("change", syncVisible);
  themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
});

onBeforeUnmount(() => {
  stopWatchingRoute();
  mediaQuery?.removeEventListener("change", syncVisible);
  themeObserver?.disconnect();
});
</script>

<style scoped>
.global-particle-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.34;
  background: transparent;
  mix-blend-mode: multiply;
}

.global-particle-backdrop :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

@media (max-width: 719px) {
  .global-particle-backdrop {
    opacity: 0.24;
  }
}
</style>
