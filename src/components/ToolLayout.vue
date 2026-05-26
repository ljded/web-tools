<script setup lang="ts">
withDefaults(
  defineProps<{
    maxWidth?: '3xl' | '4xl' | '5xl' | '6xl' | 'full'
  }>(),
  { maxWidth: '4xl' },
)

const widths: Record<string, string> = {
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-none',
}
</script>

<template>
  <UContainer :ui="{ base: `hig-workbench mx-auto pb-16 pt-1 ${widths[maxWidth]}` }">
    <div class="tool-page-stack">
      <slot />
    </div>
  </UContainer>
</template>
