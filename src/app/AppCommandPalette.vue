<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import UCommandPalette from '@nuxt/ui/components/CommandPalette.vue'
import USlideover from '@nuxt/ui/components/Slideover.vue'
import { offlineTools } from '@/tools/registry'
import { searchTools } from '@/tools/search'
import { usePersistedRef } from '@/utils/persist'

const RECENT_TOOLS_KEY = 'web-tools:recent-tools'

const open = defineModel<boolean>('open', { default: false })

const router = useRouter()
const { t } = useI18n()
const recentTools = usePersistedRef<string[]>(RECENT_TOOLS_KEY, [])
const searchTerm = ref('')

const groups = computed(() => {
  const items = searchTools(t, searchTerm.value, {
    recentNames: recentTools.value,
    preferredCapabilities: ['offline'],
  })
  const recentItems = recentTools.value
    .map((name) => items.find((item) => item.tool.name === name))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  const offlineItems = offlineTools
    .map((tool) => items.find((item) => item.tool.name === tool.name))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 12)

  const toCommandItem = ({ tool, label, description, searchText, path }: (typeof items)[number], suffix?: string) => {
    const searchTerms = [searchText, searchText.replace(/[\s._/\\,，、:：|-]+/g, '')].join(' ')

    return {
      label,
      description,
      icon: tool.icon,
      suffix: suffix ?? [tool.hotkey, tool.status, ...(tool.tags ?? []).slice(0, 2)].filter(Boolean).join(' · '),
      searchTerms,
      onSelect() {
        open.value = false
        router.push(path)
      },
    }
  }

  return [
    ...(recentItems.length
      ? [{
        id: 'recent',
        label: t('app.recent'),
        items: recentItems.map((item) => toCommandItem(item, t('app.recent'))),
      }]
      : []),
    ...(offlineItems.length
      ? [{
        id: 'offline',
        label: t('app.offlineReady'),
        items: offlineItems.map((item) => toCommandItem(item, t('app.badges.offline'))),
      }]
      : []),
    {
      id: 'tools',
      label: t('app.allTools'),
      items: items.map((item) => toCommandItem(item)),
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
      content: 'hig-modal-surface fixed left-1/2 top-4 max-h-[84vh] w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 overflow-hidden rounded-[2rem] border shadow-2xl shadow-default/20',
      body: 'p-1',
    }"
  >
    <template #body>
      <UCommandPalette
        v-model:search-term="searchTerm"
        :groups="groups"
        icon="i-lucide-search"
        :placeholder="t('app.searchTools')"
        :fuse="{ resultLimit: 12, fuseOptions: { ignoreLocation: true, threshold: 0.18, keys: ['label', 'description', 'suffix', 'searchTerms'] } }"
        :ui="{ root: 'max-h-[72vh]', input: 'border-b border-default bg-default/75', list: 'p-2', item: 'rounded-xl' }"
      />
    </template>
  </USlideover>
</template>
