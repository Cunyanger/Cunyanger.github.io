<template>
  <nav
    ref="dockRef"
    class="inspira-dock"
    :class="[
      `inspira-dock--${orientation}`,
      `inspira-dock--${direction}`,
      className,
    ]"
    :aria-label="ariaLabel"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <a
      v-for="item in items"
      :key="item.href"
      ref="itemRefs"
      class="inspira-dock__item"
      :href="item.href"
      :target="isExternal(item.href) ? '_blank' : undefined"
      :rel="isExternal(item.href) ? 'noopener noreferrer' : undefined"
      :aria-label="item.label"
      :title="item.label"
      :style="getItemStyle(item.href)"
      @focus="activeHref = item.href"
      @blur="activeHref = ''"
    >
      <span class="inspira-dock__icon" aria-hidden="true">
        <svg
          v-if="item.icon === 'github'"
          viewBox="0 0 24 24"
          role="img"
        >
          <path
            d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.19-3.37-1.19-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.04 1.53 1.04.9 1.52 2.34 1.08 2.91.82.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .85-.27 2.75 1.02A9.44 9.44 0 0 1 12 6c.85 0 1.7.11 2.5.33 1.9-1.29 2.74-1.02 2.74-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
          />
        </svg>
        <svg v-else-if="item.icon === 'image'" viewBox="0 0 24 24">
          <path
            d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM5 19v-3.2l3.2-3.2a1 1 0 0 1 1.4 0l1.4 1.4 3.4-3.4a1 1 0 0 1 1.4 0L19 13.8V19H5Zm14-8-1.8-1.8a3 3 0 0 0-4.2 0L11 11.2l-.4-.4a3 3 0 0 0-4.2 0L5 12.2V5h14v6Zm-2.5-3.5A1.5 1.5 0 1 1 15 6a1.5 1.5 0 0 1 1.5 1.5Z"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24">
          <path
            d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
          />
        </svg>
      </span>
      <span class="inspira-dock__label">{{ item.label }}</span>
    </a>
  </nav>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  magnification: {
    type: Number,
    default: 18,
  },
  distance: {
    type: Number,
    default: 96,
  },
  direction: {
    type: String,
    default: "middle",
    validator: (value) => ["top", "middle", "bottom"].includes(value),
  },
  orientation: {
    type: String,
    default: "horizontal",
    validator: (value) => ["horizontal", "vertical"].includes(value),
  },
  ariaLabel: {
    type: String,
    default: "平台链接",
  },
  class: {
    type: [String, Array, Object],
    default: "",
  },
});

const dockRef = ref(null);
const itemRefs = ref([]);
const mouseX = ref(Infinity);
const mouseY = ref(Infinity);
const activeHref = ref("");
const baseSize = 40;

const className = computed(() => props.class);
const isVertical = computed(() => props.orientation === "vertical");

const isExternal = (href) => /^(https?:)?\/\//.test(href);

const onMouseMove = (event) => {
  requestAnimationFrame(() => {
    mouseX.value = event.clientX;
    mouseY.value = event.clientY;
  });
};

const onMouseLeave = () => {
  requestAnimationFrame(() => {
    mouseX.value = Infinity;
    mouseY.value = Infinity;
  });
};

const getItemSize = (index, href) => {
  if (activeHref.value === href) {
    return baseSize + props.magnification;
  }

  const el = itemRefs.value[index];

  if (!el) return baseSize;

  const bounds = el.getBoundingClientRect();
  const pointer = isVertical.value ? mouseY.value : mouseX.value;
  const center = isVertical.value
    ? bounds.top + bounds.height / 2
    : bounds.left + bounds.width / 2;
  const delta = Math.abs(pointer - center);

  if (!Number.isFinite(delta) || delta >= props.distance) return baseSize;

  return baseSize + (1 - delta / props.distance) * props.magnification;
};

const getItemStyle = (href) => {
  const index = props.items.findIndex((item) => item.href === href);
  const size = getItemSize(index, href);

  return {
    width: `${size}px`,
    height: `${size}px`,
  };
};
</script>

<style scoped>
.inspira-dock {
  display: flex;
  width: max-content;
  border: 1px solid rgba(125, 211, 252, 0.28);
  border-radius: 16px;
  padding: 7px;
  gap: 8px;
  background: rgba(255, 255, 255, 0.42);
  box-shadow:
    0 18px 36px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(18px) saturate(1.18);
  -webkit-backdrop-filter: blur(18px) saturate(1.18);
}

.inspira-dock--vertical {
  flex-direction: column;
}

.inspira-dock--top {
  align-items: flex-start;
}

.inspira-dock--middle {
  align-items: center;
}

.inspira-dock--bottom {
  align-items: flex-end;
}

.inspira-dock__item {
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 999px;
  color: #0f172a;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
  transition:
    width 180ms ease-out,
    height 180ms ease-out,
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
}

.inspira-dock__item:hover,
.inspira-dock__item:focus-visible {
  border-color: rgba(34, 211, 238, 0.62);
  transform: translateY(-1px);
  outline: none;
}

.inspira-dock__icon {
  display: grid;
  width: 54%;
  height: 54%;
  place-items: center;
}

.inspira-dock__icon svg {
  display: block;
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.inspira-dock__label {
  position: absolute;
  bottom: calc(100% + 7px);
  left: 50%;
  z-index: 2;
  border-radius: 6px;
  padding: 4px 7px;
  color: #e5f3ff;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  background: rgba(15, 23, 42, 0.88);
  transform: translateX(-50%) translateY(4px);
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.inspira-dock__item:hover .inspira-dock__label,
.inspira-dock__item:focus-visible .inspira-dock__label {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

[data-theme="dark"] .inspira-dock {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.46);
  box-shadow:
    0 18px 36px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .inspira-dock__item {
  border-color: rgba(125, 211, 252, 0.2);
  color: #e5f3ff;
  background: rgba(15, 23, 42, 0.58);
}

@media (max-width: 719px) {
  .inspira-dock {
    gap: 6px;
    padding: 6px;
  }
}
</style>
