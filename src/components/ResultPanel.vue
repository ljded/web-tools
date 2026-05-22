<script setup lang="ts">
import CopyButton from './CopyButton.vue'

withDefaults(
  defineProps<{
    title?: string
    value?: string
    placeholder?: string
    copyable?: boolean
    monospace?: boolean
    preWrap?: boolean
  }>(),
  {
    title: '结果',
    value: '',
    placeholder: '等待输入...',
    copyable: true,
    monospace: true,
    preWrap: false,
  },
)
</script>

<template>
  <UCard
    class="rounded-2xl bg-surface p-4 shadow-sm outline outline-1 outline-outline-variant"
  >
    <div class="mb-2 flex items-center justify-between gap-3">
      <span class="text-sm font-medium text-on-surface-variant">{{ title }}</span>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <CopyButton v-if="copyable" :value="value" />
      </div>
    </div>
    <div
      class="break-all rounded-xl bg-surface-variant/50 p-3 text-sm text-on-surface"
      :class="[{ 'font-mono': monospace, 'whitespace-pre-wrap': preWrap }]"
    >
      <slot>{{ value || placeholder }}</slot>
    </div>
  </UCard>
</template>
