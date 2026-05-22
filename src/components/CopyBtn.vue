<script setup lang="ts">
import { Copy, Check } from '@lucide/vue'
import { useClipboard } from '@/composables'

interface Props {
  text: string
  msg?: string
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'button'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  variant: 'ghost',
})

const { copied, copy } = useClipboard()

async function handleCopy() {
  await copy(props.text, props.msg)
}
</script>

<template>
  <button
    @click="handleCopy"
    class="flex items-center gap-1 transition-colors"
    :class="[
      variant === 'button'
        ? 'rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container'
        : 'rounded-full p-1.5 hover:bg-surface-variant',
      size === 'sm' ? 'text-xs' : 'text-sm',
    ]"
  >
    <Check v-if="copied" class="h-3.5 w-3.5 text-primary" />
    <Copy v-else class="h-3.5 w-3.5 text-on-surface-variant" />
    <span v-if="variant === 'button'">{{ copied ? '已复制' : '复制' }}</span>
  </button>
</template>
