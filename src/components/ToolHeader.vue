<script setup lang="ts">
import { type Component } from 'vue'

interface Props {
  title: string
  description?: string
  icon?: Component
  iconClass?: string
}

defineProps<Props>()
</script>

<template>
  <div class="flex items-center gap-3">
    <div
      v-if="icon"
      class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container"
      :class="iconClass"
    >
      <component :is="icon" class="h-5 w-5" />
    </div>
    <div>
      <h2 class="text-lg font-semibold text-on-surface">{{ title }}</h2>
      <p v-if="description" class="text-xs text-on-surface-variant">{{ description }}</p>
    </div>
  </div>
</template>
