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
    class="flex items-center gap-2"
    :class="[
      wrap ? 'flex-wrap' : 'flex-nowrap',
      align === 'start' ? 'justify-start' : align === 'between' ? 'justify-between' : 'justify-end',
    ]"
  >
    <slot />
  </div>
</template>
