<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import USlideover from '@nuxt/ui/components/Slideover.vue'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import { getCurrentNavigationTitle } from '@/tools/navigation'
import { toolsByPath } from '@/tools/registry'
import { usePersistedRef } from '@/utils/persist'

const RECENT_TOOLS_KEY = 'web-tools:recent-tools'

const route = useRoute()
const { t } = useI18n()
const navigationOpen = ref(false)
const searchOpen = ref(false)
const recentTools = usePersistedRef<string[]>(RECENT_TOOLS_KEY, [])
const mainContentRef = ref<HTMLElement | null>(null)

const AppCommandPalette = defineAsyncComponent(() => import('./AppCommandPalette.vue'))
const currentTitle = computed(() => getCurrentNavigationTitle(t, route.path))

watch(
  () => route.path,
  async (path) => {
    const tool = toolsByPath.get(path)
    if (tool) {
      const next = [tool.name, ...recentTools.value.filter((item) => item !== tool.name)].slice(0, 8)
      recentTools.value = next
    }
    await nextTick()
    mainContentRef.value?.focus({ preventScroll: true })
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
  <div class="app-surface flex h-screen overflow-hidden bg-default text-default">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-inverted focus:shadow-xl focus:shadow-primary/25"
    >
      {{ t('app.skipToContent') }}
    </a>
    <AppSidebar class="hidden shrink-0 lg:flex" />

    <USlideover
      v-model:open="navigationOpen"
      side="left"
      :title="t('app.navigation')"
      :ui="{
        content: 'w-80 max-w-80 overflow-hidden rounded-r-[2rem] border-e border-default/70 p-0',
        body: 'h-full p-0',
      }"
    >
      <template #body>
        <AppSidebar @navigate="navigationOpen = false" />
      </template>
    </USlideover>

    <AppCommandPalette v-if="searchOpen" v-model:open="searchOpen" />

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <AppHeader
        :title="currentTitle"
        @open-navigation="navigationOpen = true"
        @open-search="searchOpen = true"
      />

      <main class="flex-1 overflow-hidden">
        <div id="main-content" ref="mainContentRef" tabindex="-1" class="h-full overflow-y-auto px-3 py-4 outline-none sm:px-4 md:px-6 md:py-7 xl:px-8 xl:py-9">
          <div
            v-if="route.path === '/'"
            class="mx-auto mb-6 flex max-w-6xl items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-center text-xs font-semibold text-toned shadow-sm shadow-primary/10 backdrop-blur"
          >
            <UIcon name="i-lucide-shield-check" class="size-3.5 text-primary" />
            {{ t('app.localNotice') }}
          </div>
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
