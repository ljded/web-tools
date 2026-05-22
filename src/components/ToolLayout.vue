<script setup lang="ts">

withDefaults(
  defineProps<{
    maxWidth?: '3xl' | '4xl' | '5xl' | '6xl' | 'full'
  }>(),
  { maxWidth: '4xl' },
)

const widths = {
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-none',
}
</script>

<template>
  <UContainer class="mx-auto space-y-6" :class="widths[maxWidth]">
    <slot />
  </UContainer>
</template>
