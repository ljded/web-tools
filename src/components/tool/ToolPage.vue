<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolHeader from '@/components/ToolHeader.vue'
import { tools, toolsByName, type ToolDefinition } from '@/tools/registry'

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
const router = useRouter()

const resolvedTool = computed(() => props.tool ?? tools.find((tool) => tool.name === props.name))
const title = computed(() => props.title ?? (resolvedTool.value ? t(`${resolvedTool.value.i18nKey}.title`) : ''))
const description = computed(() =>
  props.description ?? (resolvedTool.value ? t(`${resolvedTool.value.i18nKey}.desc`) : undefined),
)
const icon = computed(() => props.icon ?? resolvedTool.value?.icon)
const relatedTools = computed(() =>
  (resolvedTool.value?.related ?? [])
    .map((name) => toolsByName.get(name))
    .filter((tool): tool is ToolDefinition => Boolean(tool)),
)

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <ToolLayout :max-width="maxWidth">
    <ToolHeader :title="title" :description="description" :icon="icon">
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </ToolHeader>

    <slot />

    <UCard
      v-if="relatedTools.length"
      variant="subtle"
      :ui="{ root: 'hig-panel overflow-hidden rounded-[1.75rem] border', body: 'p-4 sm:p-5' }"
    >
      <div class="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
        <span class="h-1.5 w-1.5 rounded-full bg-primary/80" />
        {{ t('app.relatedTools') }}
      </div>
      <div class="tool-command-bar">
        <UButton
          v-for="tool in relatedTools"
          :key="tool.name"
          color="neutral"
          variant="soft"
          size="sm"
          class="rounded-full"
          @click="go(tool.path)"
        >
          <UIcon :name="tool.icon" class="size-4" />
          {{ t(`${tool.i18nKey}.title`) }}
        </UButton>
      </div>
    </UCard>
  </ToolLayout>
</template>
