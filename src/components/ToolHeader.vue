<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  icon?: string
}>()
</script>

<template>
  <div class="relative overflow-hidden rounded-[2rem] border border-default/70 bg-elevated/80 p-5 shadow-xl shadow-default/10 backdrop-blur sm:p-6">
    <div class="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-primary/12 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
    <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-center gap-3.5">
        <div
          v-if="icon"
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-contrast shadow-lg shadow-primary/20"
        >
          <UIcon :name="icon" class="size-5" />
        </div>
        <div class="min-w-0">
          <h2 class="truncate text-2xl font-black tracking-tight text-highlighted sm:text-[1.65rem]">{{ title }}</h2>
          <p v-if="description" class="mt-1.5 text-sm leading-6 text-muted">{{ description }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
