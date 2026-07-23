<script setup>
defineProps({
  class: {
    type: [String, Array, Object],
    default: "",
  },
  modelValue: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "Search...",
  },
  ariaLabel: {
    type: String,
    default: "Search",
  },
});

const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <div id="halo-search" :class="$props.class">
    <div class="aurora-glow" />
    <div class="outer-ring" />
    <div class="outer-ring" />
    <div class="outer-ring" />

    <div class="inner-glow" />

    <div class="main-border" />

    <div id="search-wrapper">
      <input
        :value="modelValue"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        type="text"
        name="text"
        class="search-field"
        @input="emit('update:modelValue', $event.target.value)"
      />
      <div id="text-mask" />
      <div class="search-btn-border" />
      <span class="search-button">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
    </div>
  </div>
</template>

<style scoped>
#halo-search {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(430px, calc(100vw - 28px));
  min-height: 78px;
}

#search-wrapper {
  position: relative;
  z-index: 3;
}

.search-field {
  width: min(301px, calc(100vw - 64px));
  height: 56px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding-right: 60px;
  padding-left: 16px;
  color: white;
  font-size: 18px;
  background: rgba(15, 23, 42, 0.46);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 10px 30px rgba(2, 6, 23, 0.22);
  backdrop-filter: blur(16px) saturate(1.18);
  -webkit-backdrop-filter: blur(16px) saturate(1.18);
}

.search-field::placeholder {
  color: #c0b9c0;
}

.search-field:focus {
  outline: none;
}

.search-field:autofill {
  box-shadow: 0 0 0 1000px rgba(15, 23, 42, 0.88) inset;
  -webkit-text-fill-color: white;
  caret-color: white;
}

.inner-glow,
.main-border,
.outer-ring,
.aurora-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: 100%;
  max-width: 424px;
  height: 100%;
  max-height: 70px;
  overflow: hidden;
  border-radius: 12px;
  filter: blur(3px);
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.inner-glow {
  max-width: 385px;
  max-height: 70px;
  border-radius: 10px;
  filter: blur(2px);
}

.inner-glow::before {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -2;
  width: 600px;
  height: 600px;
  content: "";
  background-image: conic-gradient(
    rgba(0, 0, 0, 0) 0%,
    #a099d8,
    rgba(0, 0, 0, 0) 8%,
    rgba(0, 0, 0, 0) 50%,
    #dfa2da,
    rgba(0, 0, 0, 0) 58%
  );
  background-position: 0 0;
  background-repeat: no-repeat;
  filter: brightness(1.4);
  transform: translate(-50%, -50%) rotate(83deg);
  transition: all 2s;
}

.main-border {
  max-width: 385px;
  max-height: 70px;
  border-radius: 11px;
  filter: blur(0.5px);
}

.main-border::before {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -2;
  width: 600px;
  height: 600px;
  content: "";
  background-image: conic-gradient(
    #1c191c,
    #402fb5 5%,
    #1c191c 14%,
    #1c191c 50%,
    #cf30aa 60%,
    #1c191c 64%
  );
  background-position: 0 0;
  background-repeat: no-repeat;
  filter: brightness(1.3);
  transform: translate(-50%, -50%) rotate(70deg);
  transition: all 2s;
}

.outer-ring {
  max-width: 380px;
  max-height: 65px;
}

.outer-ring::before {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -2;
  width: 600px;
  height: 600px;
  content: "";
  background-image: conic-gradient(
    rgba(0, 0, 0, 0),
    #18116a,
    rgba(0, 0, 0, 0) 10%,
    rgba(0, 0, 0, 0) 50%,
    #6e1b60,
    rgba(0, 0, 0, 0) 60%
  );
  background-position: 0 0;
  background-repeat: no-repeat;
  transform: translate(-50%, -50%) rotate(82deg);
  transition: all 2s;
}

.aurora-glow {
  max-width: 400px;
  max-height: 130px;
  overflow: hidden;
  opacity: 0.4;
  filter: blur(30px);
}

.aurora-glow::before {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -2;
  width: 999px;
  height: 999px;
  content: "";
  background-image: conic-gradient(
    #000,
    #402fb5 5%,
    #000 38%,
    #000 50%,
    #cf30aa 60%,
    #000 87%
  );
  background-position: 0 0;
  background-repeat: no-repeat;
  transform: translate(-50%, -50%) rotate(60deg);
  transition: all 2s;
}

#text-mask {
  position: absolute;
  z-index: 4;
  top: 18px;
  left: 32px;
  width: 100px;
  height: 20px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(15, 23, 42, 0.38));
}

.search-btn-border {
  position: absolute;
  z-index: 4;
  top: 7px;
  right: 7px;
  width: 42px;
  height: 42px;
  overflow: hidden;
  border-radius: 12px;
}

.search-btn-border::before {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 760px;
  height: 760px;
  content: "";
  background-image: conic-gradient(
    rgba(0, 0, 0, 0),
    #3d3a4f,
    rgba(0, 0, 0, 0) 50%,
    rgba(0, 0, 0, 0) 50%,
    #3d3a4f,
    rgba(0, 0, 0, 0) 100%
  );
  background-position: 0 0;
  background-repeat: no-repeat;
  filter: brightness(1.35);
  transform: translate(-50%, -50%) rotate(90deg);
  animation: rotate 4s linear infinite;
}

.search-button {
  position: absolute;
  top: 8px;
  right: 8px;
  isolation: isolate;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  color: #ffffff;
  background:
    linear-gradient(
      180deg,
      rgba(22, 19, 41, 0.82),
      rgba(0, 0, 0, 0.72),
      rgba(29, 27, 75, 0.82)
    ),
    rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.search-button svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

#halo-search:hover > .outer-ring::before {
  transform: translate(-50%, -50%) rotate(-98deg);
}

#halo-search:hover > .aurora-glow::before {
  transform: translate(-50%, -50%) rotate(-120deg);
}

#halo-search:hover > .inner-glow::before {
  transform: translate(-50%, -50%) rotate(-97deg);
}

#halo-search:hover > .main-border::before {
  transform: translate(-50%, -50%) rotate(-110deg);
}

#halo-search:focus-within > .outer-ring::before {
  transform: translate(-50%, -50%) rotate(442deg);
  transition: all 4s;
}

#halo-search:focus-within > .aurora-glow::before {
  transform: translate(-50%, -50%) rotate(420deg);
  transition: all 4s;
}

#halo-search:focus-within > .inner-glow::before {
  transform: translate(-50%, -50%) rotate(443deg);
  transition: all 4s;
}

#halo-search:focus-within > .main-border::before {
  transform: translate(-50%, -50%) rotate(430deg);
  transition: all 4s;
}

#search-wrapper:focus-within > #text-mask {
  display: none;
}

@keyframes rotate {
  100% {
    transform: translate(-50%, -50%) rotate(450deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-btn-border::before {
    animation: none;
  }

  .inner-glow::before,
  .main-border::before,
  .outer-ring::before,
  .aurora-glow::before {
    transition: none;
  }
}
</style>
