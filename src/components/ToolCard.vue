<script setup lang="ts">
interface Props {
  title?: string
  padding?: boolean
}

withDefaults(defineProps<Props>(), {
  padding: true,
})
</script>

<template>
  <UCard class="rounded-3xl bg-surface shadow-sm outline outline-1 outline-outline-variant [&>[data-slot=root]]:overflow-visible">
    <div v-if="title" class="mb-4 text-lg font-medium text-on-surface">{{ title }}</div>
    <div :class="padding ? 'p-6' : ''">
      <slot />
    </div>
  </UCard>
</template>