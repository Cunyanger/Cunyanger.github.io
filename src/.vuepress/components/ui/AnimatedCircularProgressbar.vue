<template>
  <div class="animated-progress" :style="{ '--progress': normalizedValue }" role="progressbar" :aria-valuenow="Math.round(value)" aria-valuemin="0" aria-valuemax="100">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#22d3ee" />
          <stop offset="50%" stop-color="#a78bfa" />
          <stop offset="100%" stop-color="#fb7185" />
        </linearGradient>
      </defs>
      <circle class="animated-progress__track" cx="60" cy="60" r="52" />
      <circle class="animated-progress__bar" cx="60" cy="60" r="52" />
    </svg>
    <span>{{ Math.round(value) }}%</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    default: 0,
  },
})

const normalizedValue = computed(() => `${Math.max(0, Math.min(props.value, 100))}`)
</script>

<style scoped>
.animated-progress {
  --progress: 0;
  --circumference: 326.7256;

  position: relative;
  display: grid;
  place-items: center;
  width: 164px;
  height: 164px;
  color: #e5f3ff;
  filter:
    drop-shadow(0 0 18px rgba(34, 211, 238, 0.32))
    drop-shadow(0 0 32px rgba(167, 139, 250, 0.2));
}

.animated-progress svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.animated-progress circle {
  fill: none;
  stroke-width: 10;
}

.animated-progress__track {
  stroke: rgba(148, 163, 184, 0.2);
}

.animated-progress__bar {
  stroke: url("#progress-gradient");
  stroke-linecap: round;
  stroke-dasharray: var(--circumference);
  stroke-dashoffset: calc(var(--circumference) - (var(--progress) / 100 * var(--circumference)));
  transition: stroke-dashoffset 120ms linear;
}

.animated-progress span {
  position: relative;
  z-index: 1;
  font-size: 1.55rem;
  font-weight: 900;
  text-shadow: 0 0 18px rgba(34, 211, 238, 0.44);
}
</style>
