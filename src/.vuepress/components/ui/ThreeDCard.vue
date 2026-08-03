<template>
  <RouteLink
    class="three-d-card"
    :to="loadingLink"
    @pointerenter="handlePointerEnter"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
    @focus="resetCard"
  >
    <span ref="bodyRef" class="three-d-card__body">
      <span class="three-d-card__meta">{{ item.date }} / {{ item.category }}</span>
      <strong>{{ item.title }}</strong>
      <span class="three-d-card__excerpt">{{ item.excerpt }}</span>

      <span class="three-d-card__preview" :class="{ 'has-cover': coverSrc }">
        <img v-if="coverSrc" :src="coverSrc" :alt="item.title" />
        <span v-else>{{ item.preview || item.excerpt }}</span>
      </span>

      <span class="three-d-card__footer">
        <span>{{ item.readingTime }}</span>
        <span class="three-d-card__visit">Visit</span>
      </span>
    </span>
  </RouteLink>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouteLink, withBase } from 'vuepress/client'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const bodyRef = ref(null)
const loadingLink = computed(() => `/loading/?to=${encodeURIComponent(props.item.link)}`)
const coverSrc = computed(() => {
  const cover = props.item.cover

  if (!cover) return ''
  if (/^(https?:)?\/\//.test(cover) || cover.startsWith('data:')) return cover

  return withBase(cover)
})

const handlePointerEnter = () => {
  bodyRef.value?.classList.add('is-pointer-inside')
}

const handlePointerMove = (event) => {
  const body = bodyRef.value

  if (!body) return

  const rect = event.currentTarget.getBoundingClientRect()
  const x = (event.clientX - rect.left - rect.width / 2) / 25
  const y = (event.clientY - rect.top - rect.height / 2) / 25

  body.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`
  body.style.setProperty('--card-glow-x', `${event.clientX - rect.left}px`)
  body.style.setProperty('--card-glow-y', `${event.clientY - rect.top}px`)
}

const resetCard = (event) => {
  const body = bodyRef.value

  if (!body) return

  body.classList.remove('is-pointer-inside')
  body.style.transform = 'rotateY(0deg) rotateX(0deg)'
  body.style.setProperty('--card-glow-x', '50%')
  body.style.setProperty('--card-glow-y', '0%')
}

const handlePointerLeave = (event) => {
  resetCard(event)
}
</script>

<style scoped>
.three-d-card {
  display: block;
  min-height: 454px;
  color: inherit;
  text-decoration: none;
  perspective: 620px;
  outline: none;
}

.three-d-card:hover,
.three-d-card:focus-visible {
  text-decoration: none;
}

.three-d-card__body {
  --card-glow-x: 50%;
  --card-glow-y: 0%;

  position: relative;
  display: grid;
  min-height: 454px;
  border: 1px solid rgba(255, 255, 255, 0.46);
  border-radius: 8px;
  padding: 22px;
  color: inherit;
  overflow: visible;
  transform: rotateY(0deg) rotateX(0deg);
  transform-style: preserve-3d;
  transition: transform 200ms linear, border-color 180ms ease, box-shadow 180ms ease;
  background: rgba(255, 255, 255, 0.42);
  box-shadow:
    0 24px 58px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(26px) saturate(1.22);
  -webkit-backdrop-filter: blur(26px) saturate(1.22);
}

[data-theme="dark"] .three-d-card__body {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.42);
  box-shadow:
    0 24px 58px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.three-d-card__body::before {
  position: absolute;
  inset: 0;
  content: "";
  opacity: 0;
  background: radial-gradient(
    circle at var(--card-glow-x) var(--card-glow-y),
    rgba(255, 255, 255, 0.5),
    rgba(255, 255, 255, 0.08) 18%,
    transparent 38%
  );
  transition: opacity 160ms ease;
  pointer-events: none;
}

.three-d-card:hover .three-d-card__body,
.three-d-card:focus-visible .three-d-card__body {
  border-color: rgba(125, 211, 252, 0.44);
  box-shadow:
    0 30px 70px rgba(37, 99, 235, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.64);
}

.three-d-card:hover .three-d-card__body::before,
.three-d-card:focus-visible .three-d-card__body::before {
  opacity: 1;
}

.three-d-card__meta,
.three-d-card__footer {
  position: relative;
  z-index: 4;
  display: block;
  color: var(--vp-c-text-mute);
  font-size: 0.88rem;
  transform: translate3d(0, 0, 0);
  transform-style: preserve-3d;
  transition: transform 500ms ease-in-out, color 180ms ease;
}

.three-d-card strong {
  position: relative;
  z-index: 6;
  display: -webkit-box;
  min-height: calc(1.28em * 2);
  margin-top: 18px;
  color: var(--vp-c-text);
  font-size: clamp(1.22rem, 2vw, 1.48rem);
  line-height: 1.28;
  letter-spacing: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  text-shadow: 0 0 0 rgba(34, 211, 238, 0);
  transform: translate3d(0, 0, 0);
  transform-origin: center left;
  transform-style: preserve-3d;
  transition: transform 500ms ease-in-out, text-shadow 180ms ease;
}

.three-d-card__excerpt {
  position: relative;
  z-index: 6;
  display: -webkit-box;
  min-height: calc(1.7em * 3);
  margin-top: 12px;
  color: var(--vp-c-text-mute);
  line-height: 1.7;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  transform: translate3d(0, 0, 0);
  transform-origin: center left;
  transform-style: preserve-3d;
  transition: transform 500ms ease-in-out, color 180ms ease;
}

.three-d-card__preview {
  position: relative;
  z-index: 3;
  display: grid;
  align-items: end;
  height: 176px;
  min-height: 176px;
  margin-top: 22px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 8px;
  padding: 0;
  overflow: visible;
  color: rgba(226, 232, 240, 0.78);
  line-height: 1.7;
  background: transparent;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transform: translate3d(0, 0, 0);
  transform-origin: center center;
  transform-style: preserve-3d;
  transition:
    transform 500ms ease-in-out,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.three-d-card__preview.has-cover {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.three-d-card__preview::after {
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  content: "";
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.14), rgba(167, 139, 250, 0.14) 48%, rgba(251, 113, 133, 0.12)),
    linear-gradient(180deg, rgba(15, 23, 42, 0.16), rgba(15, 23, 42, 0.72));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transform: translateZ(-1px);
  pointer-events: none;
}

.three-d-card__preview.has-cover::before,
.three-d-card__preview.has-cover::after {
  display: none;
}

.three-d-card__preview::before {
  position: absolute;
  inset: 0;
  z-index: 3;
  content: "";
  opacity: 0.24;
  background-image:
    linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(167, 139, 250, 0.18) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
}

.three-d-card__preview img {
  display: block;
  width: 100%;
  height: 176px;
  z-index: 2;
  object-fit: cover;
  border-radius: inherit;
  box-shadow: 0 0 0 rgba(15, 23, 42, 0);
  transform: translate3d(0, 0, 0);
  transform-origin: center center;
  transform-style: preserve-3d;
  transition: transform 500ms ease-in-out, filter 180ms ease, box-shadow 180ms ease;
}

.three-d-card__preview span {
  position: relative;
  z-index: 1;
  display: -webkit-box;
  padding: 18px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  transform: translate3d(0, 0, 0);
  transform-style: preserve-3d;
  transition: transform 500ms ease-in-out;
}

.three-d-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  align-self: end;
  margin-top: 28px;
  transform-origin: center center;
}

.three-d-card__visit {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 92px;
  height: 34px;
  border: 1px solid rgba(125, 211, 252, 0.48);
  border-radius: 8px;
  padding: 0 34px 0 16px;
  color: #e5f3ff;
  font-size: 0.86rem;
  font-weight: 800;
  overflow: hidden;
  isolation: isolate;
  background: rgba(15, 23, 42, 0.18);
  box-shadow: 0 0 18px rgba(34, 211, 238, 0.18);
  transition: color 180ms ease, border-color 180ms ease, transform 180ms ease;
  transform: translate3d(0, 0, 0);
}

.three-d-card:hover strong,
.three-d-card:focus-visible strong,
.three-d-card__body.is-pointer-inside strong {
  color: var(--vp-c-text);
  transform: translateZ(50px);
  text-shadow:
    0 10px 22px rgba(15, 23, 42, 0.16),
    0 0 20px rgba(37, 99, 235, 0.12);
}

.three-d-card:hover .three-d-card__meta,
.three-d-card:focus-visible .three-d-card__meta,
.three-d-card__body.is-pointer-inside .three-d-card__meta {
  transform: translateZ(40px);
}

.three-d-card:hover .three-d-card__excerpt,
.three-d-card:focus-visible .three-d-card__excerpt,
.three-d-card__body.is-pointer-inside .three-d-card__excerpt {
  color: rgba(51, 65, 85, 0.88);
  transform: translateZ(60px);
  text-shadow: none;
}

.three-d-card:hover .three-d-card__footer,
.three-d-card:focus-visible .three-d-card__footer,
.three-d-card__body.is-pointer-inside .three-d-card__footer {
  transform: translateZ(20px);
}

.three-d-card:hover .three-d-card__meta,
.three-d-card:focus-visible .three-d-card__meta,
.three-d-card__body.is-pointer-inside .three-d-card__meta,
.three-d-card:hover .three-d-card__excerpt,
.three-d-card:focus-visible .three-d-card__excerpt,
.three-d-card__body.is-pointer-inside .three-d-card__excerpt,
.three-d-card:hover .three-d-card__footer,
.three-d-card:focus-visible .three-d-card__footer,
.three-d-card__body.is-pointer-inside .three-d-card__footer {
  color: rgba(71, 85, 105, 0.86);
}

[data-theme="dark"] .three-d-card:hover strong,
[data-theme="dark"] .three-d-card:focus-visible strong,
[data-theme="dark"] .three-d-card__body.is-pointer-inside strong {
  color: #ffffff;
  text-shadow:
    0 2px 2px rgba(2, 6, 23, 0.95),
    0 14px 28px rgba(15, 23, 42, 0.42),
    0 0 24px rgba(34, 211, 238, 0.32);
}

[data-theme="dark"] .three-d-card:hover .three-d-card__excerpt,
[data-theme="dark"] .three-d-card:focus-visible .three-d-card__excerpt,
[data-theme="dark"] .three-d-card__body.is-pointer-inside .three-d-card__excerpt {
  color: rgba(255, 255, 255, 0.92);
  text-shadow:
    0 2px 2px rgba(2, 6, 23, 0.9),
    0 12px 24px rgba(15, 23, 42, 0.38);
}

[data-theme="dark"] .three-d-card:hover .three-d-card__meta,
[data-theme="dark"] .three-d-card:focus-visible .three-d-card__meta,
[data-theme="dark"] .three-d-card__body.is-pointer-inside .three-d-card__meta,
[data-theme="dark"] .three-d-card:hover .three-d-card__excerpt,
[data-theme="dark"] .three-d-card:focus-visible .three-d-card__excerpt,
[data-theme="dark"] .three-d-card__body.is-pointer-inside .three-d-card__excerpt,
[data-theme="dark"] .three-d-card:hover .three-d-card__footer,
[data-theme="dark"] .three-d-card:focus-visible .three-d-card__footer,
[data-theme="dark"] .three-d-card__body.is-pointer-inside .three-d-card__footer {
  color: rgba(226, 232, 240, 0.86);
}

.three-d-card:hover .three-d-card__preview,
.three-d-card:focus-visible .three-d-card__preview,
.three-d-card__body.is-pointer-inside .three-d-card__preview {
  border-color: rgba(125, 211, 252, 0.48);
  transform: translateZ(24px);
  box-shadow:
    0 20px 38px rgba(15, 23, 42, 0.28),
    0 0 28px rgba(34, 211, 238, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.three-d-card:hover .three-d-card__preview.has-cover,
.three-d-card:focus-visible .three-d-card__preview.has-cover,
.three-d-card__body.is-pointer-inside .three-d-card__preview.has-cover {
  border-color: transparent;
  box-shadow: none;
}

.three-d-card:hover .three-d-card__preview img,
.three-d-card:focus-visible .three-d-card__preview img,
.three-d-card__body.is-pointer-inside .three-d-card__preview img {
  filter: saturate(1.08) contrast(1.05);
  box-shadow: 0 24px 42px rgba(15, 23, 42, 0.34), 0 0 24px rgba(34, 211, 238, 0.16);
  transform: translateZ(100px);
}

.three-d-card:hover .three-d-card__preview span,
.three-d-card:focus-visible .three-d-card__preview span,
.three-d-card__body.is-pointer-inside .three-d-card__preview span {
  transform: translateZ(22px);
}

.three-d-card__visit::before {
  position: absolute;
  top: 50%;
  right: 9px;
  width: 20px;
  height: 20px;
  border-radius: inherit;
  content: "";
  background: #e5f3ff;
  transform: translateY(-50%);
  z-index: -1;
  transition: width 220ms ease, height 220ms ease, right 220ms ease;
}

.three-d-card__visit::after {
  position: absolute;
  top: 50%;
  right: 14px;
  color: #020617;
  content: "→";
  transform: translateY(-50%);
  z-index: 1;
  transition: transform 220ms ease, right 220ms ease;
}

.three-d-card:hover .three-d-card__visit,
.three-d-card:focus-visible .three-d-card__visit {
  color: #020617;
  border-color: #e5f3ff;
  transform: translateZ(20px);
}

.three-d-card:hover .three-d-card__visit::before,
.three-d-card:focus-visible .three-d-card__visit::before {
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  transform: none;
}

.three-d-card:hover .three-d-card__visit::after,
.three-d-card:focus-visible .three-d-card__visit::after {
  right: 13px;
  transform: translate(4px, -50%);
}

@media (hover: none), (prefers-reduced-motion: reduce) {
  .three-d-card__body {
    transform: none;
  }

  .three-d-card__meta,
  .three-d-card__footer,
  .three-d-card strong,
  .three-d-card__excerpt,
  .three-d-card__preview,
  .three-d-card__preview img,
  .three-d-card__preview span {
    transition: none;
  }
}
</style>
