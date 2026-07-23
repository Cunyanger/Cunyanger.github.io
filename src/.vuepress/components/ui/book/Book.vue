<script setup>
import { computed } from 'vue'

import {
  BOOK_COLOR_MAP as colorMap,
  BOOK_RADIUS_MAP as radiusMap,
  BOOK_SHADOW_SIZE_MAP as shadowSizeMap,
  BOOK_SIZE_MAP as sizeMap,
} from './index'

const props = defineProps({
  class: {
    type: [String, Array, Object],
    default: '',
  },
  duration: {
    type: Number,
    default: 1000,
  },
  color: {
    type: String,
    default: 'zinc',
  },
  isStatic: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: 'md',
  },
  radius: {
    type: String,
    default: 'md',
  },
  shadowSize: {
    type: String,
    default: 'lg',
  },
  cover: {
    type: String,
    default: '',
  },
  coverAlt: {
    type: String,
    default: '',
  },
})

const computedGradient = computed(() => colorMap[props.color] || colorMap.zinc)
const computedSize = computed(() => sizeMap[props.size] || sizeMap.md)
const computedRadius = computed(() => radiusMap[props.radius] || radiusMap.md)
const computedShadow = computed(() => shadowSizeMap[props.shadowSize] || shadowSizeMap.lg)
</script>

<template>
  <div :class="['book-root', props.class]">
    <div
      class="book-stage"
      :class="[computedRadius, { 'is-static': isStatic }]"
      :style="{ width: computedSize.width, transition: `transform ${props.duration}ms ease` }"
    >
      <div
        class="book-cover book-cover--front"
        :class="computedRadius"
        :style="{
          '--book-gradient-from': computedGradient.from,
          '--book-gradient-to': computedGradient.to,
          transform: 'translateZ(25px)',
          boxShadow: '5px 5px 20px var(--shadowColor)',
        }"
      >
        <img v-if="cover" class="book-cover-image" :src="cover" :alt="coverAlt" />
        <div v-if="cover" class="book-cover-shade" />
        <div class="book-spine-highlight" />
        <div class="book-content">
          <slot />
        </div>
      </div>

      <div
        class="book-pages"
        :style="{
          top: '3px',
          bottom: '3px',
          width: '48px',
          transform: `translateX(${computedSize.spineTranslation}) rotateY(90deg)`,
        }"
      />

      <div
        class="book-cover book-cover--back"
        :class="computedRadius"
        :style="{
          '--book-gradient-from': computedGradient.from,
          '--book-gradient-to': computedGradient.to,
          transform: 'translateZ(-25px)',
          boxShadow: computedShadow,
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.book-root {
  --shadowColor: #bbb;

  z-index: 10;
  width: min-content;
  perspective: 800px;
}

[data-theme="dark"] .book-root {
  --shadowColor: #111;
}

.book-stage {
  position: relative;
  aspect-ratio: 3 / 4;
  transform-style: preserve-3d;
  transform: rotateY(0deg);
}

.book-root:hover .book-stage,
.book-stage.is-static {
  transform: rotateY(-30deg);
}

.book-cover {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  padding: 24px;
  color: #ffffff;
  background: linear-gradient(to top right, var(--book-gradient-from), var(--book-gradient-to));
}

.book-cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-cover-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 42%, rgba(2, 6, 23, 0.68));
}

.book-cover--front {
  left: 0;
}

.book-cover--back {
  left: 0;
}

.book-spine-highlight {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  min-width: 8.2%;
  opacity: 0.2;
  background:
    linear-gradient(
      90deg,
      hsla(0, 0%, 100%, 0),
      hsla(0, 0%, 100%, 0) 12%,
      hsla(0, 0%, 100%, 0.25) 29.25%,
      hsla(0, 0%, 100%, 0) 50.5%,
      hsla(0, 0%, 100%, 0) 75.25%,
      hsla(0, 0%, 100%, 0.25) 91%,
      hsla(0, 0%, 100%, 0)
    ),
    linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.03),
      rgba(0, 0, 0, 0.1) 12%,
      transparent 30%,
      rgba(0, 0, 0, 0.02) 50%,
      rgba(0, 0, 0, 0.2) 73.5%,
      rgba(0, 0, 0, 0.5) 75.25%,
      rgba(0, 0, 0, 0.15) 85.25%,
      transparent
    );
}

.book-content {
  position: relative;
  z-index: 1;
  padding-left: 4px;
}

.book-pages {
  position: absolute;
  left: 0;
  background: linear-gradient(90deg, rgba(255, 255, 255, 1) 50%, rgba(249, 249, 249, 1) 50%);
}

.book-radius-sm {
  border-radius: 2px;
}

.book-radius-md {
  border-radius: 6px;
}

.book-radius-lg {
  border-radius: 8px;
}

.book-radius-xl {
  border-radius: 12px;
}

@media (hover: none), (prefers-reduced-motion: reduce) {
  .book-stage {
    transition: none !important;
  }
}
</style>
