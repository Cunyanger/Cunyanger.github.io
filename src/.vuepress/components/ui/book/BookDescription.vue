<script setup>
defineProps({
  class: {
    type: [String, Array, Object],
    default: '',
  },
})
</script>

<template>
  <p :class="['book-description', $props.class]">
    <slot />
  </p>
</template>

<style scoped>
.book-description {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.6;
  user-select: none;
}
</style>
