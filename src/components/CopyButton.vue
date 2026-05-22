<script setup lang="ts">
import { ref } from 'vue'
import { Check, Copy } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'

const props = withDefaults(
  defineProps<{
    value: string
    label?: string
    copiedLabel?: string
    compact?: boolean
    disabled?: boolean
  }>(),
  {
    label: '复制',
    copiedLabel: '已复制',
    compact: false,
    disabled: false,
  },
)

const copied = ref(false)

async function copyValue() {
  if (props.disabled || !props.value) return
  const ok = await copyToClipboard(props.value)
  if (!ok) return
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <UButton
    type="button"
    variant="ghost"
    color="primary"
    :disabled="disabled || !value"
    class="inline-flex items-center justify-center gap-1 rounded-full font-medium text-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
    :class="compact ? 'p-1.5' : 'px-3 py-1 text-xs'"
    @click="copyValue"
  >
    <Check v-if="copied" class="h-3.5 w-3.5" />
    <Copy v-else class="h-3.5 w-3.5" />
    <span v-if="!compact">{{ copied ? copiedLabel : label }}</span>
  </UButton>
</template>
