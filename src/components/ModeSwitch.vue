<script setup lang="ts">
import { type Component } from 'vue'

interface ModeOption<T> {
  value: T
  label: string
  icon?: Component
}

interface Props<T> {
  modelValue: T
  options: ModeOption<T>[]
  color?: 'primary' | 'secondary' | 'tertiary'
}

const props = withDefaults(defineProps<Props<string | number>>(), {
  color: 'primary',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

function select(value: string | number) {
  emit('update:modelValue', value)
}

const colorMap = {
  primary: {
    active: 'border-primary text-primary',
    inactive: 'border-transparent text-on-surface-variant hover:text-on-surface',
  },
  secondary: {
    active: 'border-secondary text-secondary',
    inactive: 'border-transparent text-on-surface-variant hover:text-on-surface',
  },
  tertiary: {
    active: 'border-tertiary text-tertiary',
    inactive: 'border-transparent text-on-surface-variant hover:text-on-surface',
  },
}
</script>

<template>
  <div class="flex border-b border-outline-variant">
    <button
      v-for="opt in options"
      :key="opt.value"
      @click="select(opt.value)"
      class="flex flex-1 items-center justify-center gap-2 border-b-2 py-3.5 text-sm font-medium transition-colors"
      :class="modelValue === opt.value ? colorMap[color].active : colorMap[color].inactive"
    >
      <component v-if="opt.icon" :is="opt.icon" class="h-4 w-4" />
      {{ opt.label }}
    </button>
  </div>
</template>
