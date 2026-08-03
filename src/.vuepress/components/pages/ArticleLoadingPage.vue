<template>
  <main class="article-loading" aria-labelledby="loading-title">
    <ParticleBackground track-window :fps="18" />

    <div class="article-loading__panel">
      <AnimatedCircularProgressbar :value="progress" />
      <p class="article-loading__eyebrow">Loading Article</p>
      <h1 id="loading-title">正在加载</h1>
      <p>准备内容、背景和阅读视图。</p>
    </div>
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { withBase } from "vuepress/client";
import { useRouter } from "vue-router";

import ParticleBackground from "../effects/ParticleBackground.vue";
import AnimatedCircularProgressbar from "../ui/AnimatedCircularProgressbar.vue";

const router = useRouter();
const progress = ref(0);

let animationFrame = 0;
let startTime = 0;
let isCompleting = false;
let redirectTimer = 0;

const pendingDuration = 900;
const completeDuration = 600;
const pendingProgressLimit = 92;

const resolveTarget = () => {
  const rawTarget =
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("to");
  const target = typeof rawTarget === "string" ? rawTarget : "/article/";

  return target.startsWith("/") && !target.startsWith("//")
    ? target
    : "/article/";
};

const animatePending = (timestamp) => {
  if (!startTime) startTime = timestamp;
  if (isCompleting) return;

  const elapsed = timestamp - startTime;
  progress.value = Math.min(
    pendingProgressLimit,
    (elapsed / pendingDuration) * pendingProgressLimit,
  );

  if (progress.value < pendingProgressLimit) {
    animationFrame = window.requestAnimationFrame(animatePending);
  } else {
    progress.value = pendingProgressLimit;
  }
};

const completeAndRedirect = (target) => {
  if (isCompleting) return;

  isCompleting = true;
  window.cancelAnimationFrame(animationFrame);

  const initialProgress = progress.value;
  let completeStartTime = 0;

  const animateComplete = (timestamp) => {
    if (!completeStartTime) completeStartTime = timestamp;

    const elapsed = timestamp - completeStartTime;
    const ratio = Math.min(1, elapsed / completeDuration);
    progress.value = initialProgress + (100 - initialProgress) * ratio;

    if (ratio < 1) {
      animationFrame = window.requestAnimationFrame(animateComplete);
    } else {
      progress.value = 100;
      if (router?.replace) {
        router.replace(target).catch(() => {
          window.location.href = withBase(target);
        });
      } else {
        window.location.href = withBase(target);
      }
    }
  };

  animationFrame = window.requestAnimationFrame(animateComplete);
};

onMounted(() => {
  const target = resolveTarget();

  animationFrame = window.requestAnimationFrame(animatePending);
  redirectTimer = window.setTimeout(() => {
    completeAndRedirect(target);
  }, pendingDuration);
});

onBeforeUnmount(() => {
  window.clearTimeout(redirectTimer);
  window.cancelAnimationFrame(animationFrame);
});
</script>

<style scoped>
.article-loading {
  position: relative;
  display: grid;
  min-height: 100svh;
  overflow: hidden;
  isolation: isolate;
  place-items: center;
  padding: 32px;
  color: #e5f3ff;
  background:
    linear-gradient(
      120deg,
      rgba(2, 6, 23, 0.98),
      rgba(15, 23, 42, 0.96) 46%,
      rgba(19, 78, 74, 0.9)
    ),
    linear-gradient(90deg, rgba(37, 99, 235, 0.12), rgba(245, 158, 11, 0.08));
}

.article-loading__panel {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  width: min(420px, 100%);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  padding: 38px 28px;
  text-align: center;
  background: rgba(15, 23, 42, 0.64);
  box-shadow: 0 24px 68px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(18px);
}

.article-loading__eyebrow {
  margin: 24px 0 0;
  color: #5eead4;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.article-loading h1 {
  margin: 8px 0 0;
  color: transparent;
  font-size: 2rem;
  letter-spacing: 0;
  background: linear-gradient(
    90deg,
    #22d3ee,
    #a78bfa,
    #fb7185,
    #facc15,
    #22d3ee
  );
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  animation: loading-title-gradient 4s linear infinite;
}

.article-loading p:last-child {
  margin: 12px 0 0;
  color: rgba(226, 232, 240, 0.72);
}

@keyframes loading-title-gradient {
  from {
    background-position: 0% 50%;
  }

  to {
    background-position: 200% 50%;
  }
}
</style>
