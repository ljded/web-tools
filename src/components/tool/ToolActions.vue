<script setup lang="ts">
withDefaults(
  defineProps<{
    align?: 'start' | 'end' | 'between'
    wrap?: boolean
  }>(),
  {
    align: 'end',
    wrap: true,
  },
)
</script>

<template>
  <div
    class="tool-command-bar min-w-0"
    :class="[
      wrap ? 'flex-wrap' : 'flex-nowrap overflow-x-auto',
      align === 'start' ? 'justify-start' : align === 'between' ? 'justify-between' : 'justify-end',
    ]"
  >
    <slot />
  </div>
</template>
