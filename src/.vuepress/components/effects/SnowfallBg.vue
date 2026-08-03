<script setup>
import { useDevicePixelRatio } from "@vueuse/core";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";

const props = defineProps({
  color: {
    type: String,
    default: "#FFF",
  },
  quantity: {
    type: Number,
    default: 100,
  },
  fps: {
    type: Number,
    default: 24,
  },
  speed: {
    type: Number,
    default: 1,
  },
  maxRadius: {
    type: Number,
    default: 3,
  },
  minRadius: {
    type: Number,
    default: 1,
  },
  class: {
    type: String,
    default: "",
  },
});

const canvasRef = ref(null);
const canvasContainerRef = ref(null);
const context = ref(null);
const snowflakes = ref([]);
const canvasSize = reactive({ w: 0, h: 0 });
const { pixelRatio } = useDevicePixelRatio();
let animationId = 0;
let lastFrameTime = 0;
let isVisible = true;

const color = computed(() => {
  const hex = props.color.replace(/^#/, "").padStart(6, "0");
  const bigint = Number.parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r} ${g} ${b}`;
});

onMounted(() => {
  if (canvasRef.value) {
    context.value = canvasRef.value.getContext("2d");
  }
  isVisible = document.visibilityState === "visible";
  initCanvas();
  startAnimation();
  window.addEventListener("resize", initCanvas);
  document.addEventListener("visibilitychange", syncVisibility);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", initCanvas);
  document.removeEventListener("visibilitychange", syncVisibility);
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});

function startAnimation() {
  if (animationId || !isVisible) return;

  animationId = requestAnimationFrame(animate);
}

function stopAnimation() {
  if (!animationId) return;

  cancelAnimationFrame(animationId);
  animationId = 0;
  lastFrameTime = 0;
}

function syncVisibility() {
  isVisible = document.visibilityState === "visible";

  if (isVisible) {
    startAnimation();
  } else {
    stopAnimation();
  }
}

function initCanvas() {
  resizeCanvas();
  createSnowflakes();
}

function resizeCanvas() {
  if (canvasContainerRef.value && canvasRef.value && context.value) {
    snowflakes.value.length = 0;
    canvasSize.w = canvasContainerRef.value.offsetWidth;
    canvasSize.h = canvasContainerRef.value.offsetHeight;
    const dpr = Math.min(pixelRatio.value || 1, 1.5);

    canvasRef.value.width = canvasSize.w * dpr;
    canvasRef.value.height = canvasSize.h * dpr;
    canvasRef.value.style.width = `${canvasSize.w}px`;
    canvasRef.value.style.height = `${canvasSize.h}px`;
    context.value.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

function createSnowflakes() {
  for (let index = 0; index < props.quantity; index += 1) {
    snowflakes.value.push(createSnowflake());
  }
}

function createSnowflake() {
  const x = Math.random() * canvasSize.w;
  const y = Math.random() * canvasSize.h;
  const size =
    Math.random() * (props.maxRadius - props.minRadius) + props.minRadius;
  const alpha = Math.random() * 0.28 + 0.72;
  const dx = (Math.random() - 0.5) * 0.5;
  const dy = Math.random() * 0.25 + props.speed;

  return { x, y, size, alpha, dx, dy };
}

function drawSnowflake(snowflake) {
  if (!context.value) return;

  const { x, y, size, alpha } = snowflake;
  context.value.beginPath();
  context.value.arc(x, y, size, 0, Math.PI * 2);
  context.value.fillStyle = `rgba(${color.value.split(" ").join(", ")}, ${alpha})`;
  context.value.fill();
}

function animate(timestamp) {
  const frameInterval = 1000 / Math.max(1, Math.min(props.fps, 60));

  if (timestamp - lastFrameTime < frameInterval) {
    animationId = requestAnimationFrame(animate);
    return;
  }

  lastFrameTime = timestamp;

  if (context.value) {
    context.value.clearRect(0, 0, canvasSize.w, canvasSize.h);
  }

  snowflakes.value.forEach((snowflake) => {
    snowflake.x += snowflake.dx;
    snowflake.y += snowflake.dy;

    if (snowflake.y > canvasSize.h) {
      snowflake.y = -snowflake.size;
      snowflake.x = Math.random() * canvasSize.w;
    }

    drawSnowflake(snowflake);
  });

  animationId = requestAnimationFrame(animate);
}
</script>

<template>
  <div ref="canvasContainerRef" :class="$props.class" aria-hidden="true">
    <canvas ref="canvasRef" />
  </div>
</template>
