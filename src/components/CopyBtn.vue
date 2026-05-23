<script setup lang="ts">
import { useClipboard } from '@/composables'

interface Props {
  text: string
  msg?: string
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'button'
  compact?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  variant: 'ghost',
  compact: false,
  disabled: false,
})

const { copied, copy } = useClipboard()

async function handleCopy() {
  await copy(props.text, props.msg)
}
</script>

<template>
  <UButton
    type="button"
    color="neutral"
    variant="ghost"
    size="xs"
    :disabled="disabled || !text"
    :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
    :class="[
      variant === 'button'
        ? 'text-primary hover:bg-primary/10'
        : 'text-muted hover:bg-elevated',
      compact ? 'p-1' : 'px-2 py-1',
    ]"
    @click="handleCopy"
  >
    <span v-if="!compact" class="text-xs">{{ copied ? '已复制' : '复制' }}</span>
  </UButton>
</template>
