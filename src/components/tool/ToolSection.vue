<script setup lang="ts">
import ToolCard from '@/components/ToolCard.vue'

defineProps<{
  title?: string
  description?: string
  padding?: boolean
  compact?: boolean
  flush?: boolean
}>()
</script>

<template>
  <ToolCard
    :title="title"
    :description="description"
    :padding="padding"
    :compact="compact"
    :flush="flush"
  >
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>
    <slot />
  </ToolCard>
</template>
