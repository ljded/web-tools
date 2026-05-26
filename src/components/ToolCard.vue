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
      root: 'hig-panel hig-hover-lift overflow-hidden rounded-[1.75rem] border transition-colors',
      header: 'hig-divider border-b bg-default/20 px-4 py-4 sm:px-6',
      body: flush || padding === false ? 'h-full p-0' : compact ? 'p-4' : 'p-4 sm:p-6',
    }"
  >
    <template v-if="title || description || $slots.header || $slots.actions" #header>
      <slot name="header">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <div v-if="title" class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-primary/80" />
              <h3 class="text-sm font-extrabold tracking-tight text-highlighted sm:text-base">{{ title }}</h3>
            </div>
            <p v-if="description" class="mt-1.5 text-sm leading-6 text-muted">{{ description }}</p>
          </div>
          <div v-if="$slots.actions" class="tool-command-bar shrink-0">
            <slot name="actions" />
          </div>
        </div>
      </slot>
    </template>
    <slot />
  </UCard>
</template>
