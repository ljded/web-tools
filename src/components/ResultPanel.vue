<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CopyBtn from './CopyBtn.vue'

const { t } = useI18n()

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
    title: undefined,
    value: '',
    placeholder: undefined,
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
    variant="subtle"
    :ui="{ root: 'overflow-hidden rounded-3xl border-default/70 bg-elevated/75 shadow-lg shadow-default/5', body: compact ? 'p-3' : 'p-4' }"
  >
    <div class="mb-2 flex items-center justify-between gap-3">
      <span class="text-xs font-medium uppercase tracking-wide text-muted">{{ title || t('app.result') }}</span>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <CopyBtn v-if="copyable" :text="value" variant="button" />
      </div>
    </div>
    <div
      class="break-all rounded-2xl border border-default/60 p-3 text-sm leading-6 shadow-inner shadow-default/5"
      :style="maxHeight ? { maxHeight, overflow: 'auto' } : undefined"
      :class="[colorClasses[color], { 'font-mono': monospace, 'whitespace-pre-wrap': preWrap }]"
    >
      <slot>{{ value || placeholder || t('app.waitingForInput') }}</slot>
    </div>
  </UCard>
</template>
