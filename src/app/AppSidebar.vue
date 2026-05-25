<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import UNavigationMenu from '@nuxt/ui/components/NavigationMenu.vue'
import { createAppNavigation, createFavoriteNavigationItems } from '@/tools/navigation'
import { usePersistedRef } from '@/utils/persist'

const FAVORITE_TOOLS_KEY = 'web-tools:favorite-tools'

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()
const { t } = useI18n()
const favoriteTools = usePersistedRef<string[]>(FAVORITE_TOOLS_KEY, [])

const navigationItems = computed(() =>
  createAppNavigation(t, route.path, () => emit('navigate')),
)

const favoriteNavigationItems = computed(() =>
  createFavoriteNavigationItems(t, route.path, favoriteTools.value, () => emit('navigate')),
)
</script>

<template>
  <aside class="glass-panel flex h-full w-72 flex-col border-e border-default/70" role="navigation">
    <div class="px-4 pb-4 pt-5">
      <div class="flex items-center gap-3 rounded-2xl border border-default bg-default/70 p-3 shadow-sm">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-contrast shadow-lg shadow-primary/20">
          <span class="text-sm font-black tracking-tight">WT</span>
        </div>
        <div class="min-w-0">
          <div class="truncate text-base font-semibold tracking-tight text-highlighted">
            {{ t('app.title') }}
          </div>
          <div class="text-xs font-medium text-muted">{{ t('app.subtitle') }}</div>
        </div>
      </div>
    </div>

    <nav class="flex-1 space-y-3 overflow-y-auto px-3 pb-3">
      <UCard
        v-if="favoriteNavigationItems.length"
        variant="subtle"
        :ui="{ root: 'rounded-2xl border-default/70 bg-default/65', body: 'p-2' }"
      >
        <div class="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted">{{ t('app.favorites') }}</div>
        <UNavigationMenu
          :items="favoriteNavigationItems"
          orientation="vertical"
          color="warning"
          variant="pill"
          class="w-full"
          :ui="{
            root: 'gap-1',
            link: 'rounded-xl px-3 py-2 text-sm font-medium',
          }"
        />
      </UCard>

      <UNavigationMenu
        :items="navigationItems"
        orientation="vertical"
        color="primary"
        variant="pill"
        class="w-full"
        :ui="{
          root: 'gap-1.5',
          link: 'rounded-2xl px-3 py-2.5 font-medium',
          childList: 'ms-5 border-s border-default/70 ps-2',
          childLink: 'rounded-xl px-3 py-2 text-sm',
        }"
      />
    </nav>

    <div class="border-t border-default/70 px-4 py-4">
      <a
        href="https://github.com/ljded/web-tools"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-2 rounded-2xl border border-default bg-default/60 px-3 py-2 text-xs font-medium text-muted shadow-sm transition-colors hover:bg-accented hover:text-default"
      >
        <UIcon name="i-lucide-github" class="size-4" />
        GitHub
      </a>
    </div>
  </aside>
</template>
