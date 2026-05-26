<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CopyBtn from './CopyBtn.vue'

const { t } = useI18n()

type MetaItem = { label: string; value: string | number }

const props = withDefaults(
  defineProps<{
    title?: string
    value?: string
    placeholder?: string
    emptyText?: string
    error?: string
    loading?: boolean
    meta?: string | MetaItem[]
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
    emptyText: undefined,
    error: '',
    loading: false,
    meta: undefined,
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

const stateColor = computed(() => props.error ? 'error' : props.color)
const displayValue = computed(() => props.error || props.value || props.emptyText || props.placeholder || t('app.waitingForInput'))
const metaItems = computed(() => Array.isArray(props.meta) ? props.meta : [])
</script>

<template>
  <UCard
    variant="subtle"
    :ui="{ root: 'hig-surface overflow-hidden rounded-[1.75rem] border transition-colors', body: compact ? 'p-3' : 'p-4 sm:p-5' }"
  >
    <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span class="h-1.5 w-1.5 rounded-full" :class="error ? 'bg-error' : loading ? 'bg-primary animate-pulse' : 'bg-success/80'" />
          <span class="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">{{ title || t('app.result') }}</span>
          <span v-if="typeof meta === 'string' && meta" class="truncate text-xs text-muted">{{ meta }}</span>
          <UBadge v-if="error" color="error" variant="soft" size="xs" class="rounded-full">{{ t('app.error') }}</UBadge>
          <UBadge v-else-if="loading" color="primary" variant="soft" size="xs" class="rounded-full">{{ t('app.loading') }}</UBadge>
        </div>
      </div>
      <div class="tool-command-bar">
        <slot name="actions" />
        <CopyBtn v-if="copyable" :text="value" variant="button" :disabled="loading || !value" />
      </div>
    </div>

    <div v-if="metaItems.length || $slots.meta" class="mb-3 flex flex-wrap gap-2">
      <slot name="meta">
        <UBadge v-for="item in metaItems" :key="item.label" color="neutral" variant="soft" size="xs" class="rounded-full">
          {{ item.label }}: {{ item.value }}
        </UBadge>
      </slot>
    </div>

    <div
      class="hig-subtle-surface min-h-16 break-all rounded-[1.35rem] border p-3 text-sm leading-6 shadow-inner shadow-default/5 sm:p-4"
      :style="maxHeight ? { maxHeight, overflow: 'auto' } : undefined"
      :class="[colorClasses[stateColor], { 'font-mono': monospace, 'whitespace-pre-wrap': preWrap }]"
    >
      <div v-if="loading" class="space-y-2">
        <USkeleton class="h-4 w-3/4" />
        <USkeleton class="h-4 w-1/2" />
      </div>
      <slot v-else>{{ displayValue }}</slot>
    </div>

    <div v-if="$slots.footer" class="mt-3">
      <slot name="footer" />
    </div>
  </UCard>
</template>
