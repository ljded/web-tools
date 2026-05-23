<script setup lang="ts">
import CopyBtn from './CopyBtn.vue'

withDefaults(
  defineProps<{
    title?: string
    value?: string
    placeholder?: string
    copyable?: boolean
    monospace?: boolean
    preWrap?: boolean
    color?: 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'
    maxHeight?: string
    compact?: boolean
  }>(),
  {
    title: '结果',
    value: '',
    placeholder: '等待输入...',
    copyable: true,
    monospace: true,
    preWrap: false,
    color: 'neutral',
    maxHeight: '',
    compact: false,
  },
)

const colorClasses = {
  neutral: 'bg-elevated text-default',
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-success/10 text-success',
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
}
</script>

<template>
  <UCard
    variant="outline"
    :ui="{ root: 'overflow-hidden rounded-3xl shadow-sm', body: compact ? 'p-3' : 'p-4' }"
  >
    <div class="mb-2 flex items-center justify-between gap-3">
      <span class="text-xs font-medium uppercase tracking-wide text-muted">{{ title }}</span>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <CopyBtn v-if="copyable" :text="value" variant="button" />
      </div>
    </div>
    <div
      class="break-all rounded-2xl p-3 text-sm"
      :style="maxHeight ? { maxHeight, overflow: 'auto' } : undefined"
      :class="[colorClasses[color], { 'font-mono': monospace, 'whitespace-pre-wrap': preWrap }]"
    >
      <slot>{{ value || placeholder }}</slot>
    </div>
  </UCard>
</template>
