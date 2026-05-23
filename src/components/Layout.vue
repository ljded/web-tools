<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { tools, domainI18nKeys, type ToolDomain } from '@/tools/registry'
import { usePreferenceStore } from '@/stores/preference'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const drawerOpen = ref(false)
const preference = usePreferenceStore()
const { t } = useI18n()
const localeItems = [
  { label: '中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
]

const homeItem = computed(() => ({ path: '/', label: t('nav.home') }))

const groups = computed(() =>
  (['dev', 'text', 'crypto', 'media'] as ToolDomain[]).map((domain) => ({
    label: t(domainI18nKeys[domain]),
    domain,
    items: tools
      .filter((tool) => tool.domain === domain)
      .map((tool) => ({
        path: tool.path,
        label: t(`${tool.i18nKey}.title`),
        icon: tool.icon,
        color: tool.color,
      })),
  })),
)

const expanded = ref<Record<string, boolean>>({})
function initExpanded() {
  groups.value.forEach((g) => {
    expanded.value[g.label] = g.items.some((i) => i.path === route.path)
  })
}
initExpanded()
watch(() => route.path, initExpanded)
watch(() => route.path, () => { drawerOpen.value = false })

const allNavItems = computed(() => [homeItem.value, ...groups.value.flatMap((g) => g.items)])
const currentTitle = computed(() => {
  const item = allNavItems.value.find((i) => i.path === route.path)
  return item?.label ?? t('app.title')
})
function goTo(path: string) { router.push(path); drawerOpen.value = false }
</script>

<template>
  <div class="flex h-screen bg-default">
    <!-- Mobile overlay -->
    <Transition name="fade">
      <div
        v-if="drawerOpen"
        class="fixed inset-0 z-40 bg-inverted/50 backdrop-blur-sm md:hidden"
        @click="drawerOpen = false"
        aria-hidden="true"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-e border-default bg-elevated transition-transform duration-300 md:relative md:translate-x-0"
      :class="drawerOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'"
      role="navigation"
    >
      <!-- Brand -->
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

      <!-- Nav -->
      <nav class="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        <UButton
          :label="homeItem.label"
          icon="i-lucide-home"
          color="neutral"
          variant="ghost"
          @click="goTo(homeItem.path)"
          class="w-full justify-start rounded-xl text-sm font-medium"
          :class="route.path === homeItem.path
            ? 'bg-primary/10 text-primary'
            : 'text-default hover:bg-accented'"
        />

        <div v-for="group in groups" :key="group.label">
          <UButton
            :label="group.label"
            color="neutral"
            variant="ghost"
            @click="expanded[group.label] = !expanded[group.label]"
            class="w-full justify-between rounded-xl text-xs font-semibold uppercase tracking-wide text-muted hover:text-default"
            :trailing-icon="expanded[group.label] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          />
          <div v-show="expanded[group.label]" class="mt-0.5 space-y-0.5">
            <UButton
              v-for="item in group.items"
              :key="item.path"
              color="neutral"
              variant="ghost"
              @click="goTo(item.path)"
              class="w-full justify-start rounded-xl pl-7 text-sm font-medium transition-all"
              :class="route.path === item.path
                ? 'bg-primary/10 text-primary'
                : 'text-default hover:bg-accented'"
            >
              <template #leading>
                <UIcon :name="item.icon" class="size-4" />
              </template>
              {{ item.label }}
            </UButton>
          </div>
        </div>
      </nav>

      <!-- Footer -->
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

    <!-- Main -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <header class="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-default bg-default/85 px-4 backdrop-blur-xl">
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="drawerOpen = true"
          class="rounded-full md:hidden"
          :ui="{ base: 'rounded-full' }"
        />
        <h1 class="text-base font-semibold truncate text-highlighted">{{ currentTitle }}</h1>
        <div class="ml-auto flex items-center gap-2">
          <UColorModeSelect color="neutral" variant="ghost" size="sm" class="w-32" />
          <div class="mx-1 h-5 w-px bg-default" />
          <USelect
            v-model="preference.locale"
            :items="localeItems"
            color="neutral"
            variant="ghost"
            size="sm"
            class="w-28"
          />
        </div>
      </header>

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

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
