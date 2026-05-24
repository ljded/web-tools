<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import UCommandPalette from '@nuxt/ui/components/CommandPalette.vue'
import USlideover from '@nuxt/ui/components/Slideover.vue'
import { createToolSearchItems } from '@/tools/search'

const open = defineModel<boolean>('open', { default: false })

const router = useRouter()
const { t } = useI18n()

const groups = computed(() => [
  {
    id: 'tools',
    label: t('app.allTools'),
    items: createToolSearchItems(t).map(({ tool, label, description }) => ({
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
])
</script>

<template>
  <USlideover
    v-model:open="open"
    side="top"
    :title="t('app.allTools')"
    :ui="{
      content: 'mx-auto mt-4 max-h-[80vh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl',
      body: 'p-0',
    }"
  >
    <template #body>
      <UCommandPalette
        :groups="groups"
        icon="i-lucide-search"
        :placeholder="t('app.searchTools')"
        :fuse="{ resultLimit: 12 }"
        :ui="{ root: 'max-h-[70vh]', input: 'border-b border-default' }"
      />
    </template>
  </USlideover>
</template>
