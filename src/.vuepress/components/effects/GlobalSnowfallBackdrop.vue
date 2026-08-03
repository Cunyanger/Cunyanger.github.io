<template>
  <div v-if="enabled" class="global-snowfall-backdrop" aria-hidden="true">
    <SnowfallBg
      class="global-snowfall-backdrop__canvas"
      color="#ffffff"
      :quantity="70"
      :fps="18"
      :speed="0.78"
      :min-radius="0.7"
      :max-radius="2.8"
    />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

import SnowfallBg from "./SnowfallBg.vue";

const enabled = ref(false);
const currentTheme = ref("light");
let mediaQuery = null;
let themeObserver = null;

const syncMotionPreference = () => {
  enabled.value = !mediaQuery?.matches && currentTheme.value === "dark";
};

const syncTheme = () => {
  currentTheme.value =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  syncMotionPreference();
};

onMounted(() => {
  mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  syncTheme();
  mediaQuery.addEventListener("change", syncMotionPreference);
  themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
});

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener("change", syncMotionPreference);
  themeObserver?.disconnect();
});
</script>

<style scoped>
.global-snowfall-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.56;
  background: transparent;
  filter: brightness(1.25) drop-shadow(0 0 5px rgba(255, 255, 255, 0.72));
  mix-blend-mode: screen;
}

.global-snowfall-backdrop__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.global-snowfall-backdrop__canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

:global([data-theme="dark"]) .global-snowfall-backdrop {
  opacity: 0.82;
}

@media (max-width: 719px) {
  .global-snowfall-backdrop {
    opacity: 0.46;
  }

  :global([data-theme="dark"]) .global-snowfall-backdrop {
    opacity: 0.68;
  }
}
</style>
