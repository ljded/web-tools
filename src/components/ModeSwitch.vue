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
    active: 'border-primary text-(--ui-primary)',
    inactive: 'border-transparent text-(--ui-text-dimmed) hover:text-(--ui-text)',
  },
  secondary: {
    active: 'border-secondary text-secondary',
    inactive: 'border-transparent text-(--ui-text-dimmed) hover:text-(--ui-text)',
  },
  tertiary: {
    active: 'border-tertiary text-tertiary',
    inactive: 'border-transparent text-(--ui-text-dimmed) hover:text-(--ui-text)',
  },
}
</script>

<template>
  <div class="flex border-b border-default">
    <UButton
      v-for="opt in options"
      :key="opt.value"
      color="neutral"
      variant="ghost"
      size="sm"
      class="flex flex-1 items-center justify-center gap-2 border-b-2 py-3.5 text-sm font-medium transition-colors"
      :class="modelValue === opt.value ? colorMap[color].active : colorMap[color].inactive"
      @click="select(opt.value)"
    >
      <component v-if="opt.icon" :is="opt.icon" class="h-4 w-4" />
      {{ opt.label }}
    </UButton>
  </div>
</template>
