<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@/composables'

const { t } = useI18n()

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
  await copy(props.text, props.msg || t('app.copySuccess'))
}
</script>

<template>
  <UButton
    type="button"
    color="neutral"
    variant="ghost"
    size="xs"
    :aria-label="copied ? t('app.copied') : t('app.copy')"
    :title="copied ? t('app.copied') : t('app.copy')"
    :disabled="disabled || !text"
    :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
    :class="[
      'focus-visible:hig-focus rounded-full',
      variant === 'button'
        ? 'text-primary hover:bg-primary/10'
        : 'text-muted hover:bg-elevated',
      compact ? 'p-1' : 'px-2 py-1',
    ]"
    @click="handleCopy"
  >
    <span v-if="!compact" class="text-xs">{{ copied ? t('app.copied') : t('app.copy') }}</span>
  </UButton>
</template>
