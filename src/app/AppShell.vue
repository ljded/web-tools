<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import USlideover from '@nuxt/ui/components/Slideover.vue'
import AppCommandPalette from './AppCommandPalette.vue'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import { getCurrentNavigationTitle } from '@/tools/navigation'
import { tools } from '@/tools/registry'
import { usePersistedRef } from '@/utils/persist'

const RECENT_TOOLS_KEY = 'web-tools:recent-tools'

const route = useRoute()
const { t } = useI18n()
const navigationOpen = ref(false)
const searchOpen = ref(false)
const recentTools = usePersistedRef<string[]>(RECENT_TOOLS_KEY, [])

const currentTitle = computed(() => getCurrentNavigationTitle(t, route.path))

watch(
  () => route.path,
  (path) => {
    const tool = tools.find((item) => item.path === path)
    if (!tool) return
    const next = [tool.name, ...recentTools.value.filter((item) => item !== tool.name)].slice(0, 8)
    recentTools.value = next
  },
  { immediate: true },
)

defineShortcuts({
  meta_k: () => {
    searchOpen.value = true
  },
})
</script>

<template>
  <div class="app-surface flex h-screen bg-default text-default">
    <AppSidebar class="hidden shrink-0 md:flex" />

    <USlideover
      v-model:open="navigationOpen"
      side="left"
      title="Navigation"
      :ui="{
        content: 'w-72 max-w-72 overflow-hidden rounded-r-3xl p-0',
        body: 'h-full p-0',
      }"
    >
      <template #body>
        <AppSidebar @navigate="navigationOpen = false" />
      </template>
    </USlideover>

    <AppCommandPalette v-model:open="searchOpen" />

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <AppHeader
        :title="currentTitle"
        @open-navigation="navigationOpen = true"
        @open-search="searchOpen = true"
      />

      <main class="flex-1 overflow-hidden">
        <div class="h-full overflow-y-auto px-4 py-5 md:px-6 md:py-7 lg:px-8 lg:py-9">
          <div
            v-if="route.path === '/'"
            class="mx-auto mb-6 max-w-6xl rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-center text-xs font-medium text-toned shadow-sm shadow-primary/10"
          >
            {{ t('app.localNotice') }}
          </div>
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
