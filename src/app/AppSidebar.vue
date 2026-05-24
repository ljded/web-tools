<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import UNavigationMenu from '@nuxt/ui/components/NavigationMenu.vue'
import { createAppNavigation } from '@/tools/navigation'

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()
const { t } = useI18n()

const navigationItems = computed(() =>
  createAppNavigation(t, route.path, () => emit('navigate')),
)
</script>

<template>
  <aside class="flex h-full w-64 flex-col border-e border-default bg-elevated" role="navigation">
    <div class="flex h-16 items-center gap-3 border-b border-default px-5">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-contrast">
        <span class="text-sm font-bold">WT</span>
      </div>
      <div class="min-w-0">
        <div class="truncate text-base font-semibold tracking-tight text-highlighted">
          {{ t('app.title') }}
        </div>
        <div class="text-xs font-medium text-muted">{{ t('app.subtitle') }}</div>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 py-3">
      <UNavigationMenu
        :items="navigationItems"
        orientation="vertical"
        color="primary"
        variant="pill"
        class="w-full"
        :ui="{
          root: 'gap-1',
          link: 'rounded-xl',
          childList: 'ms-4 border-s border-default',
          childLink: 'rounded-xl',
        }"
      />
    </nav>

    <div class="border-t border-default px-4 py-3">
      <a
        href="https://github.com/ljded/web-tools"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted transition-colors hover:bg-accented hover:text-default"
      >
        <UIcon name="i-lucide-github" class="size-4" />
        GitHub
      </a>
    </div>
  </aside>
</template>
