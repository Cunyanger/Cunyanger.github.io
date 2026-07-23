<script setup>
defineProps({
  class: {
    type: [String, Array, Object],
    default: '',
  },
})
</script>

<template>
  <div :class="['book-header', $props.class]">
    <slot />
  </div>
</template>

<style scoped>
.book-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
