<template>
  <button
    class="global-scroll-progress"
    type="button"
    aria-label="回到顶部"
    title="回到顶部"
    @click="scrollToTop"
  >
    <AnimatedCircularProgressbar :value="progress" />
  </button>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vuepress/client'

import AnimatedCircularProgressbar from '../ui/AnimatedCircularProgressbar.vue'

const route = useRoute()
const progress = ref(0)
let frame = 0

const updateProgress = () => {
  frame = 0

  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
  const scrollHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  )
  const maxScroll = Math.max(0, scrollHeight - window.innerHeight)

  progress.value = maxScroll
    ? Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100))
    : 100
}

const requestProgressUpdate = () => {
  if (frame) return
  frame = window.requestAnimationFrame(updateProgress)
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  updateProgress()
  window.addEventListener('scroll', requestProgressUpdate, { passive: true })
  window.addEventListener('resize', requestProgressUpdate)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', requestProgressUpdate)
  window.removeEventListener('resize', requestProgressUpdate)

  if (frame) window.cancelAnimationFrame(frame)
})

watch(
  () => route.path,
  async () => {
    await nextTick()
    window.requestAnimationFrame(updateProgress)
  },
)
</script>

<style scoped>
.global-scroll-progress {
  position: fixed;
  right: 18px;
  bottom: calc(18px + env(safe-area-inset-bottom));
  z-index: 40;
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border: 1px solid rgba(125, 211, 252, 0.3);
  border-radius: 999px;
  padding: 0;
  color: #e5f3ff;
  cursor: pointer;
  background: rgba(15, 23, 42, 0.5);
  box-shadow:
    0 14px 34px rgba(15, 23, 42, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.global-scroll-progress:hover,
.global-scroll-progress:focus-visible {
  border-color: rgba(125, 211, 252, 0.72);
  outline: none;
  box-shadow:
    0 0 22px rgba(34, 211, 238, 0.24),
    0 16px 36px rgba(15, 23, 42, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.global-scroll-progress::after {
  position: absolute;
  inset: 0;
  display: grid;
  color: #e5f3ff;
  font-size: 1.35rem;
  font-weight: 900;
  line-height: 1;
  content: "↑";
  opacity: 0;
  place-items: center;
  text-shadow: 0 0 12px rgba(34, 211, 238, 0.46);
  transition: opacity 140ms ease;
  pointer-events: none;
}

.global-scroll-progress:hover::after,
.global-scroll-progress:focus-visible::after {
  opacity: 1;
}

.global-scroll-progress :deep(.animated-progress) {
  width: 54px;
  height: 54px;
  filter: none;
}

.global-scroll-progress :deep(.animated-progress circle) {
  stroke-width: 9;
}

.global-scroll-progress :deep(.animated-progress span) {
  font-size: 0.82rem;
  text-shadow: 0 0 10px rgba(34, 211, 238, 0.42);
  transition: opacity 140ms ease;
}

.global-scroll-progress:hover :deep(.animated-progress span),
.global-scroll-progress:focus-visible :deep(.animated-progress span) {
  opacity: 0;
}

@media (max-width: 719px) {
  .global-scroll-progress {
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom));
    width: 56px;
    height: 56px;
  }

  .global-scroll-progress :deep(.animated-progress) {
    width: 49px;
    height: 49px;
  }
}
</style>
