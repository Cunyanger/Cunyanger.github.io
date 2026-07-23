<template>
  <canvas
    v-if="enabled"
    ref="canvasRef"
    :class="['sleek-line-cursor', props.class]"
    aria-hidden="true"
  ></canvas>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";

const props = defineProps({
  class: {
    type: [String, Array, Object],
    default: "",
  },
  trails: {
    type: Number,
    default: 8,
  },
  size: {
    type: Number,
    default: 15,
  },
  friction: {
    type: Number,
    default: 0.6,
  },
  dampening: {
    type: Number,
    default: 0.2,
  },
  tension: {
    type: Number,
    default: 0.99,
  },
});

const canvasRef = ref(null);
const enabled = ref(false);
const theme = ref("light");

const trailCount = computed(() => Math.max(1, Math.floor(props.trails)));
const nodeCount = computed(() => Math.max(2, Math.floor(props.size)));

let animationFrame = 0;
let themeObserver = null;
let cleanupListeners = () => {};

const pointer = {
  active: false,
  x: 0,
  y: 0,
};

const createTrails = () =>
  Array.from({ length: trailCount.value }, (_, trailIndex) => ({
    phase: trailIndex / trailCount.value,
    nodes: Array.from({ length: nodeCount.value }, () => ({
      x: pointer.x,
      y: pointer.y,
      vx: 0,
      vy: 0,
    })),
  }));

let trails = [];

const syncTheme = () => {
  theme.value =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
};

const setCanvasSize = (canvas, context) => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
};

const getStrokeColor = (phase, alpha) => {
  const time = performance.now() * 0.00013;
  const palette =
    theme.value === "dark"
      ? [
          [45, 212, 191],
          [56, 189, 248],
          [129, 140, 248],
          [167, 139, 250],
          [244, 114, 182],
          [45, 212, 191],
        ]
      : [
          [52, 211, 153],
          [34, 211, 238],
          [96, 165, 250],
          [168, 85, 247],
          [244, 114, 182],
          [52, 211, 153],
        ];

  const cycle = (phase + time) % 1;
  const scaled = cycle * (palette.length - 1);
  const index = Math.floor(scaled);
  const ratio = scaled - index;
  const start = palette[index];
  const end = palette[index + 1];
  const r = Math.round(start[0] + (end[0] - start[0]) * ratio);
  const g = Math.round(start[1] + (end[1] - start[1]) * ratio);
  const b = Math.round(start[2] + (end[2] - start[2]) * ratio);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawTrail = (context, trail, trailIndex) => {
  const nodes = trail.nodes;

  if (nodes.length < 2) return;

  context.beginPath();
  context.moveTo(nodes[0].x, nodes[0].y);

  for (let index = 1; index < nodes.length - 1; index += 1) {
    const current = nodes[index];
    const next = nodes[index + 1];
    const midpointX = (current.x + next.x) / 2;
    const midpointY = (current.y + next.y) / 2;

    context.quadraticCurveTo(current.x, current.y, midpointX, midpointY);
  }

  const tailWeight = 1 - trailIndex / trailCount.value;
  const alpha = 0.08 + tailWeight * (theme.value === "dark" ? 0.2 : 0.16);

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.globalCompositeOperation = "lighter";
  context.shadowColor =
    theme.value === "dark"
      ? "rgba(34, 211, 238, 0.4)"
      : "rgba(45, 212, 191, 0.24)";

  context.shadowBlur = theme.value === "dark" ? 20 : 14;
  context.strokeStyle = getStrokeColor(trail.phase, alpha * 0.18);
  context.lineWidth = 8 + tailWeight * 9;
  context.stroke();

  context.shadowBlur = theme.value === "dark" ? 12 : 8;
  context.strokeStyle = getStrokeColor(trail.phase, alpha);
  context.lineWidth = 1.6 + tailWeight * 3.2;
  context.stroke();
  context.restore();
};

const updateTrail = (trail, trailIndex) => {
  let targetX = pointer.x;
  let targetY = pointer.y;
  let targetVx = 0;
  let targetVy = 0;
  const trailOffset = trailIndex / trailCount.value;

  for (let index = 0; index < trail.nodes.length; index += 1) {
    const node = trail.nodes[index];
    const tailProgress = index / trail.nodes.length;
    const spring =
      (0.18 + trailOffset * 0.035) * props.tension * (1 - tailProgress * 0.52);

    node.vx += (targetX - node.x) * spring;
    node.vy += (targetY - node.y) * spring;
    node.vx += targetVx * props.dampening;
    node.vy += targetVy * props.dampening;
    node.vx *= props.friction;
    node.vy *= props.friction;
    node.x += node.vx;
    node.y += node.vy;

    targetX = node.x;
    targetY = node.y;
    targetVx = node.vx;
    targetVy = node.vy;
  }
};

const initCursor = () => {
  const canvas = canvasRef.value;
  const context = canvas?.getContext("2d");

  if (!canvas || !context) return;

  pointer.x = window.innerWidth / 2;
  pointer.y = window.innerHeight / 2;
  trails = createTrails();
  setCanvasSize(canvas, context);

  const resize = () => setCanvasSize(canvas, context);
  const move = (event) => {
    pointer.active = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };
  const leave = () => {
    pointer.active = false;
  };

  const render = () => {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (pointer.active) {
      context.globalCompositeOperation =
        theme.value === "dark" ? "lighter" : "source-over";

      trails.forEach((trail, index) => {
        updateTrail(trail, index);
        drawTrail(context, trail, index);
      });

      context.globalCompositeOperation = "source-over";
    }

    animationFrame = window.requestAnimationFrame(render);
  };

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerleave", leave);

  cleanupListeners = () => {
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerleave", leave);
  };

  render();
};

watch([trailCount, nodeCount], () => {
  if (!enabled.value) return;

  trails = createTrails();
});

onMounted(async () => {
  const supportsFinePointer = window.matchMedia("(pointer: fine)").matches;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (!supportsFinePointer || prefersReducedMotion) return;

  syncTheme();
  themeObserver = new MutationObserver(syncTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  enabled.value = true;
  await nextTick();
  initCursor();
});

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrame);
  cleanupListeners();
  themeObserver?.disconnect();
});
</script>

<style scoped>
.sleek-line-cursor {
  position: fixed;
  inset: 0;
  z-index: 160;
  display: block;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
}
</style>
