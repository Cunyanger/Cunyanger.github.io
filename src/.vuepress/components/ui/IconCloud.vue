<template>
  <nav class="icon-cloud" :class="className" :aria-label="ariaLabel">
    <canvas
      ref="canvasRef"
      class="icon-cloud__canvas"
      width="300"
      height="300"
      role="img"
      :aria-label="ariaLabel"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
      @pointerleave="handlePointerLeave"
    />

    <a
      v-for="item in normalizedItems"
      :key="item.href"
      class="icon-cloud__link"
      :href="item.href"
      :target="isExternal(item.href) ? '_blank' : undefined"
      :rel="isExternal(item.href) ? 'noopener noreferrer' : undefined"
    >
      {{ item.label }}
    </a>
  </nav>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  ariaLabel: {
    type: String,
    default: "平台图标云",
  },
  class: {
    type: [String, Array, Object],
    default: "",
  },
});

const canvasRef = ref(null);
const animationFrameRef = ref(0);
const imageCanvasesRef = ref([]);
const imagesLoadedRef = ref([]);
const imagePositions = ref([]);
const hoveredIconId = ref(null);
const pressedIconId = ref(null);
const pointerStart = reactive({ x: 0, y: 0 });
const rotation = reactive({ x: 0, y: 0 });
const isDragging = ref(false);
const lastPointerPos = reactive({ x: 0, y: 0 });
const pointerPos = reactive({ x: 150, y: 150 });
const targetRotation = ref(null);

const className = computed(() => props.class);

const iconSvgData = {
  github:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%23181717'/%3E%3Cpath fill='white' d='M20 8.4a11.8 11.8 0 0 0-3.7 23c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.4-1.3-5.4-5.8 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.9 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.2 0 4.5-2.8 5.5-5.4 5.8.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.8 11.8 0 0 0 20 8.4Z'/%3E%3C/svg%3E",
  image:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%230ea5e9'/%3E%3Cpath fill='white' d='M11 28h18a2 2 0 0 0 2-2V14a2 2 0 0 0-2-2H11a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Zm1.7-4.2 4-4a1.4 1.4 0 0 1 2 0l1.8 1.8 3.1-3.1a1.4 1.4 0 0 1 2 0L29 21.9V26H11l1.7-2.2ZM26.5 17a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'/%3E%3C/svg%3E",
  user:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='20' fill='%236366f1'/%3E%3Cpath fill='white' d='M20 20.5a6 6 0 1 0-6-6 6 6 0 0 0 6 6Zm0 3c-5.3 0-9.5 2.7-9.5 6v1h19v-1c0-3.3-4.2-6-9.5-6Z'/%3E%3C/svg%3E",
};

const simpleIconSlugs = {
  github: "github",
  gitlab: "gitlab",
  gitee: "gitee",
  x: "x",
  twitter: "x",
  juejin: "juejin",
  zhihu: "zhihu",
  bilibili: "bilibili",
  youtube: "youtube",
  telegram: "telegram",
  email: "maildotru",
  mail: "maildotru",
};

const isExternal = (href) => /^(https?:)?\/\//.test(href);

const getIconImage = (item) => {
  const icon = String(item.icon || item.label || "").toLowerCase();

  if (/^(https?:)?\/\//.test(item.icon || "") || String(item.icon || "").startsWith("/")) {
    return item.icon;
  }

  if (iconSvgData[icon]) {
    return iconSvgData[icon];
  }

  if (simpleIconSlugs[icon]) {
    return `https://cdn.simpleicons.org/${simpleIconSlugs[icon]}/${simpleIconSlugs[icon]}`;
  }

  if (icon.includes("github") || String(item.href || "").includes("github.com")) {
    return iconSvgData.github;
  }

  if (icon.includes("image") || icon.includes("pic") || icon.includes("photo")) {
    return iconSvgData.image;
  }

  return iconSvgData.user;
};

const normalizedItems = computed(() =>
  props.items
    .map((item) => {
      if (!item) return null;

      const href = item.href || item.link || item.url;
      const label = item.label || item.text || item.name || href;

      if (!href || !label) return null;

      return {
        href,
        label,
        image: item.image || getIconImage(item),
      };
    })
    .filter(Boolean),
);

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

const updateImagePositions = () => {
  const count = normalizedItems.value.length;

  if (!count) {
    imagePositions.value = [];
    return;
  }

  const offset = 2 / count;
  const increment = Math.PI * (3 - Math.sqrt(5));

  imagePositions.value = Array.from({ length: count }, (_, index) => {
    const y = index * offset - 1 + offset / 2;
    const r = Math.sqrt(1 - y * y);
    const phi = index * increment;

    return {
      id: index,
      x: Math.cos(phi) * r * 100,
      y: y * 100,
      z: Math.sin(phi) * r * 100,
    };
  });
};

const loadImages = () => {
  if (typeof document === "undefined") return;

  imagesLoadedRef.value = new Array(normalizedItems.value.length).fill(false);
  imageCanvasesRef.value = normalizedItems.value.map((item, index) => {
    const offscreen = document.createElement("canvas");
    offscreen.width = 40;
    offscreen.height = 40;

    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return offscreen;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = item.image;
    img.onload = () => {
      offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
      offCtx.save();
      offCtx.beginPath();
      offCtx.arc(20, 20, 20, 0, Math.PI * 2);
      offCtx.closePath();
      offCtx.clip();
      offCtx.drawImage(img, 0, 0, 40, 40);
      offCtx.restore();
      imagesLoadedRef.value[index] = true;
    };

    return offscreen;
  });
};

const getRotatedIcon = (icon) => {
  const cosX = Math.cos(rotation.x);
  const sinX = Math.sin(rotation.x);
  const cosY = Math.cos(rotation.y);
  const sinY = Math.sin(rotation.y);
  const rotatedX = icon.x * cosY - icon.z * sinY;
  const rotatedZ = icon.x * sinY + icon.z * cosY;
  const rotatedY = icon.y * cosX + rotatedZ * sinX;

  return { x: rotatedX, y: rotatedY, z: rotatedZ };
};

const getIconAtPoint = (x, y) => {
  const canvas = canvasRef.value;
  if (!canvas) return null;

  return [...imagePositions.value]
    .map((icon) => {
      const rotated = getRotatedIcon(icon);
      const screenX = canvas.width / 2 + rotated.x;
      const screenY = canvas.height / 2 + rotated.y;
      const scale = (rotated.z + 200) / 300;
      const radius = 20 * scale + 8;
      const dx = x - screenX;
      const dy = y - screenY;

      return {
        icon,
        rotatedZ: rotated.z,
        hit: dx * dx + dy * dy < radius * radius,
      };
    })
    .filter((entry) => entry.hit)
    .sort((a, b) => b.rotatedZ - a.rotatedZ)[0]?.icon || null;
};

const focusIcon = (icon) => {
  if (!icon) return;

  const targetX = -Math.atan2(icon.y, Math.sqrt(icon.x * icon.x + icon.z * icon.z));
  const targetY = Math.atan2(icon.x, icon.z);
  const distance = Math.sqrt((targetX - rotation.x) ** 2 + (targetY - rotation.y) ** 2);

  targetRotation.value = {
    x: targetX,
    y: targetY,
    startX: rotation.x,
    startY: rotation.y,
    startTime: performance.now(),
    duration: Math.min(1800, Math.max(700, distance * 900)),
  };
};

const navigateToIcon = (icon) => {
  const item = normalizedItems.value[icon.id];
  if (!item || typeof window === "undefined") return;

  if (isExternal(item.href)) {
    window.open(item.href, "_blank", "noopener,noreferrer");
    return;
  }

  window.location.href = item.href;
};

const updatePointer = (event) => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  pointerPos.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  pointerPos.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
};

const handlePointerDown = (event) => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  updatePointer(event);
  const icon = getIconAtPoint(pointerPos.x, pointerPos.y);
  focusIcon(icon);
  pressedIconId.value = icon?.id ?? null;
  isDragging.value = true;
  pointerStart.x = event.clientX;
  pointerStart.y = event.clientY;
  lastPointerPos.x = event.clientX;
  lastPointerPos.y = event.clientY;
  canvas.setPointerCapture?.(event.pointerId);
};

const handlePointerMove = (event) => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  updatePointer(event);
  hoveredIconId.value = getIconAtPoint(pointerPos.x, pointerPos.y)?.id ?? null;

  if (isDragging.value) {
    const deltaX = event.clientX - lastPointerPos.x;
    const deltaY = event.clientY - lastPointerPos.y;

    rotation.x += deltaY * 0.002;
    rotation.y += deltaX * 0.002;

    lastPointerPos.x = event.clientX;
    lastPointerPos.y = event.clientY;
  }

  canvas.style.cursor = hoveredIconId.value === null ? "grab" : "pointer";
};

const handlePointerUp = (event) => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  updatePointer(event);
  const icon = getIconAtPoint(pointerPos.x, pointerPos.y);
  const moveDistance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);

  if (icon && icon.id === pressedIconId.value && moveDistance < 8) {
    navigateToIcon(icon);
  }

  isDragging.value = false;
  pressedIconId.value = null;
  canvas.releasePointerCapture?.(event.pointerId);
};

const handlePointerCancel = () => {
  isDragging.value = false;
  pressedIconId.value = null;
};

const handlePointerLeave = () => {
  hoveredIconId.value = null;
  isDragging.value = false;

  if (canvasRef.value) {
    canvasRef.value.style.cursor = "grab";
  }
};

const animate = () => {
  const canvas = canvasRef.value;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const dx = pointerPos.x - centerX;
  const dy = pointerPos.y - centerY;
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = 0.003 + (distance / maxDistance) * 0.01;

  if (targetRotation.value) {
    const { startX, startY, x, y, startTime, duration } = targetRotation.value;
    const progress = Math.min(1, (performance.now() - startTime) / duration);
    const eased = easeOutCubic(progress);

    rotation.x = startX + (x - startX) * eased;
    rotation.y = startY + (y - startY) * eased;

    if (progress >= 1) targetRotation.value = null;
  } else if (!isDragging.value) {
    rotation.x += (dy / canvas.height) * speed;
    rotation.y += (dx / canvas.width) * speed;
  }

  imagePositions.value.forEach((icon, index) => {
    const rotated = getRotatedIcon(icon);
    const scale = (rotated.z + 200) / 300;
    const opacity = Math.max(0.24, Math.min(1, (rotated.z + 150) / 200));
    const isHovered = hoveredIconId.value === icon.id;
    const iconSize = isHovered ? 46 : 40;

    ctx.save();
    ctx.translate(centerX + rotated.x, centerY + rotated.y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = opacity;

    if (isHovered) {
      ctx.shadowColor = "rgba(34, 211, 238, 0.54)";
      ctx.shadowBlur = 18;
    }

    if (imageCanvasesRef.value[index] && imagesLoadedRef.value[index]) {
      ctx.drawImage(
        imageCanvasesRef.value[index],
        -iconSize / 2,
        -iconSize / 2,
        iconSize,
        iconSize,
      );
    }

    ctx.restore();
  });

  animationFrameRef.value = requestAnimationFrame(animate);
};

onMounted(() => {
  updateImagePositions();
  loadImages();

  nextTick(() => {
    animationFrameRef.value = requestAnimationFrame(animate);
  });
});

watch(
  normalizedItems,
  () => {
    updateImagePositions();
    loadImages();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  if (animationFrameRef.value) {
    cancelAnimationFrame(animationFrameRef.value);
  }
});
</script>

<style scoped>
.icon-cloud {
  position: relative;
  display: grid;
  width: 100%;
  max-width: 260px;
  aspect-ratio: 1;
  place-items: center;
}

.icon-cloud__canvas {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  cursor: grab;
  touch-action: none;
}

.icon-cloud__canvas:active {
  cursor: grabbing;
}

.icon-cloud__link {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  border: 0;
  padding: 0;
  overflow: hidden;
  white-space: nowrap;
  clip: rect(0 0 0 0);
}
</style>
