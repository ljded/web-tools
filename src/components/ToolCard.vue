<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  padding?: boolean
  compact?: boolean
  flush?: boolean
}>()
</script>

<template>
  <UCard
    variant="outline"
    :ui="{
      root: 'overflow-hidden rounded-3xl shadow-sm',
      header: 'px-5 py-4 sm:px-6',
      body: flush || padding === false ? 'h-full p-0' : compact ? 'p-4' : 'p-5 sm:p-6',
    }"
  >
    <template v-if="title || description || $slots.header || $slots.actions" #header>
      <slot name="header">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <h3 v-if="title" class="text-sm font-semibold text-highlighted">{{ title }}</h3>
            <p v-if="description" class="mt-1 text-sm leading-6 text-muted">{{ description }}</p>
          </div>
          <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
            <slot name="actions" />
          </div>
        </div>
      </slot>
    </template>
    <slot />
  </UCard>
</template>
