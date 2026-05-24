<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import USlideover from '@nuxt/ui/components/Slideover.vue'
import AppCommandPalette from './AppCommandPalette.vue'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import { getCurrentNavigationTitle } from '@/tools/navigation'

const route = useRoute()
const { t } = useI18n()
const navigationOpen = ref(false)
const searchOpen = ref(false)

const currentTitle = computed(() => getCurrentNavigationTitle(t, route.path))

defineShortcuts({
  meta_k: () => {
    searchOpen.value = true
  },
})
</script>

<template>
  <div class="flex h-screen bg-default">
    <AppSidebar class="hidden shrink-0 md:flex" />

    <USlideover
      v-model:open="navigationOpen"
      side="left"
      title="Navigation"
      :ui="{
        content: 'w-64 max-w-64 p-0',
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

      <div
        v-if="route.path === '/'"
        class="bg-primary/5 px-4 py-1.5 text-center text-xs font-medium text-muted"
      >
        {{ t('app.localNotice') }}
      </div>

      <main class="flex-1 overflow-hidden">
        <div class="h-full overflow-y-auto p-4 md:p-6 lg:p-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
