<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolHeader from '@/components/ToolHeader.vue'
import { tools, type ToolDefinition } from '@/tools/registry'

const props = withDefaults(
  defineProps<{
    name?: string
    tool?: ToolDefinition
    title?: string
    description?: string
    icon?: string
    maxWidth?: '3xl' | '4xl' | '5xl' | '6xl' | 'full'
  }>(),
  { maxWidth: '4xl' },
)

const { t } = useI18n()

const resolvedTool = computed(() => props.tool ?? tools.find((tool) => tool.name === props.name))
const title = computed(() => props.title ?? (resolvedTool.value ? t(`${resolvedTool.value.i18nKey}.title`) : ''))
const description = computed(() =>
  props.description ?? (resolvedTool.value ? t(`${resolvedTool.value.i18nKey}.desc`) : undefined),
)
const icon = computed(() => props.icon ?? resolvedTool.value?.icon)
</script>

<template>
  <ToolLayout :max-width="maxWidth">
    <ToolHeader :title="title" :description="description" :icon="icon">
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </ToolHeader>

    <slot />
  </ToolLayout>
</template>
