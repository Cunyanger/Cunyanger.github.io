<script setup>
defineProps({
  class: {
    type: [String, Array, Object],
    default: '',
  },
})
</script>

<template>
  <h1 :class="['book-title', $props.class]">
    <slot />
  </h1>
</template>

<style scoped>
.book-title {
  margin: 12px 0 4px;
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0;
  text-wrap: balance;
  user-select: none;
}
</style>
