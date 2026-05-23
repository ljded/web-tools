<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  icon?: string
}>()
</script>

<template>
  <div class="overflow-hidden rounded-3xl border border-default bg-elevated/40 p-4 shadow-sm">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-center gap-3">
        <div
          v-if="icon"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15"
        >
          <UIcon :name="icon" class="size-5" />
        </div>
        <div class="min-w-0">
          <h2 class="truncate text-xl font-semibold tracking-tight text-highlighted">{{ title }}</h2>
          <p v-if="description" class="mt-1 text-sm leading-6 text-muted">{{ description }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
