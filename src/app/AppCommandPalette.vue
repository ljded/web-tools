<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import UCommandPalette from '@nuxt/ui/components/CommandPalette.vue'
import USlideover from '@nuxt/ui/components/Slideover.vue'
import { createToolSearchItems } from '@/tools/search'
import { usePersistedRef } from '@/utils/persist'

const RECENT_TOOLS_KEY = 'web-tools:recent-tools'

const open = defineModel<boolean>('open', { default: false })

const router = useRouter()
const { t } = useI18n()
const recentTools = usePersistedRef<string[]>(RECENT_TOOLS_KEY, [])

const groups = computed(() => {
  const items = createToolSearchItems(t)
  const recentItems = recentTools.value
    .map((name) => items.find((item) => item.tool.name === name))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  return [
    ...(recentItems.length
      ? [{
        id: 'recent',
        label: t('app.recent'),
        items: recentItems.map(({ tool, label, description }) => ({
          label,
          description,
          icon: tool.icon,
          suffix: t('app.recent'),
          onSelect() {
            open.value = false
            router.push(tool.path)
          },
        })),
      }]
      : []),
    {
      id: 'tools',
      label: t('app.allTools'),
      items: items.map(({ tool, label, description }) => ({
        label,
        description,
        icon: tool.icon,
        suffix: tool.tags?.join(' / '),
        onSelect() {
          open.value = false
          router.push(tool.path)
        },
      })),
    },
  ]
})
</script>

<template>
  <USlideover
    v-model:open="open"
    side="top"
    :title="t('app.allTools')"
    :ui="{
      content: 'mx-auto mt-4 max-h-[82vh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-3xl border border-default/70 bg-elevated/95 shadow-2xl shadow-default/15',
      body: 'p-0',
    }"
  >
    <template #body>
      <UCommandPalette
        :groups="groups"
        icon="i-lucide-search"
        :placeholder="t('app.searchTools')"
        :fuse="{ resultLimit: 12 }"
        :ui="{ root: 'max-h-[72vh]', input: 'border-b border-default bg-default/75', list: 'p-2', item: 'rounded-xl' }"
      />
    </template>
  </USlideover>
</template>
