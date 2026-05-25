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
    variant="subtle"
    :ui="{
      root: 'overflow-hidden rounded-3xl border-default/70 bg-elevated/75 shadow-lg shadow-default/5 backdrop-blur',
      header: 'border-b border-default/70 bg-default/45 px-5 py-4 sm:px-6',
      body: flush || padding === false ? 'h-full p-0' : compact ? 'p-4' : 'p-5 sm:p-6',
    }"
  >
    <template v-if="title || description || $slots.header || $slots.actions" #header>
      <slot name="header">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <h3 v-if="title" class="text-sm font-bold tracking-tight text-highlighted sm:text-[0.92rem]">{{ title }}</h3>
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
