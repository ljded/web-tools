<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, Menu, ChevronLeft, ChevronDown, Sun, Moon, Monitor } from '@lucide/vue'
import { tools, domainI18nKeys, type ToolDomain } from '@/tools/registry'
import { usePreferenceStore } from '@/stores/preference'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const drawerOpen = ref(false)
const preference = usePreferenceStore()
const { t } = useI18n()

const homeItem = computed(() => ({ path: '/', label: t('nav.home'), icon: Home }))

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

const allNavItems = computed(() => [homeItem.value, ...groups.value.flatMap((g) => g.items)])

const currentTitle = computed(() => {
  const item = allNavItems.value.find((i) => i.path === route.path)
  return item?.label ?? t('app.title')
})

function goTo(path: string) { router.push(path); drawerOpen.value = false }

// Close drawer on route change
watch(() => route.path, () => { drawerOpen.value = false })
</script>

<template>
  <div class="flex h-screen bg-background">
    <!-- Mobile overlay -->
    <Transition name="fade">
      <div v-if="drawerOpen" class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" @click="drawerOpen = false" aria-hidden="true" />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-outline-variant/50 bg-surface/95 backdrop-blur-xl transition-transform duration-300 ease-out md:relative md:translate-x-0"
      :class="drawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'"
      role="navigation" aria-label="主导航"
    >
      <!-- Mobile close -->
      <div class="flex h-14 items-center gap-3 border-b border-outline-variant/50 px-4 md:hidden">
        <UButton variant="ghost" color="neutral" @click="drawerOpen = false" class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-variant" aria-label="关闭导航菜单">
          <ChevronLeft class="h-5 w-5 text-on-surface" aria-hidden="true" />
        </UButton>
        <span class="text-lg font-semibold text-on-surface">Web Tools</span>
      </div>

      <!-- Brand -->
      <div class="hidden h-16 items-center gap-3 border-b border-outline-variant/50 px-5 md:flex">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-on-primary shadow-sm">
          <Monitor class="h-5 w-5" />
        </div>
        <div>
          <div class="text-base font-semibold tracking-tight text-on-surface">{{ t('app.title') }}</div>
          <div class="text-[11px] font-medium text-on-surface-variant">{{ t('app.subtitle') }}</div>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3" aria-label="工具导航">
        <!-- Home -->
        <UButton variant="ghost" color="neutral" @click="goTo(homeItem.path)" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200" :class="route.path === homeItem.path ? 'bg-secondary-container/60 text-on-secondary-container shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant/60'" :aria-current="route.path === homeItem.path ? 'page' : undefined">
          <component :is="homeItem.icon" class="h-4.5 w-4.5" aria-hidden="true" /> {{ homeItem.label }}
        </UButton>

        <!-- Groups -->
        <div v-for="group in groups" :key="group.label">
          <UButton variant="ghost" color="neutral" @click="expanded[group.label] = !expanded[group.label]" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/60 transition-colors hover:text-on-surface-variant" :aria-expanded="expanded[group.label]">
            {{ group.label }}
            <ChevronDown class="h-3.5 w-3.5 transition-transform duration-200" :class="expanded[group.label] ? 'rotate-180' : ''" aria-hidden="true" />
          </UButton>
          <div v-show="expanded[group.label]" class="mt-0.5 space-y-0.5" role="group" :aria-label="group.label">
            <UButton v-for="item in group.items" :key="item.path" variant="ghost" color="neutral" @click="goTo(item.path)" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200" :class="route.path === item.path ? 'bg-secondary-container/60 text-on-secondary-container shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant/60'" :aria-current="route.path === item.path ? 'page' : undefined">
              <component :is="item.icon" class="h-4.5 w-4.5 shrink-0" aria-hidden="true" /> {{ item.label }}
            </UButton>
          </div>
        </div>
      </nav>

      <!-- Footer -->
      <div class="border-t border-outline-variant/50 px-4 py-3">
        <a href="https://github.com/ljded/web-tools" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-on-surface-variant/60 transition-colors hover:text-on-surface-variant hover:bg-surface-variant/40">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.38 6.84 9.74.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.93.86.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.99c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.38-.01-2.49-.01-2.82 0 .27.18.59.69.49A10.11 10.11 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" /></svg>
          GitHub
        </a>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- AppBar -->
      <header class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-outline-variant/40 bg-surface/80 px-4 backdrop-blur-xl">
        <UButton variant="ghost" color="neutral" @click="drawerOpen = true" class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-variant md:hidden" aria-label="打开导航菜单">
          <Menu class="h-5 w-5 text-on-surface" aria-hidden="true" />
        </UButton>
        <h1 class="text-base font-semibold text-on-surface truncate">{{ currentTitle }}</h1>
        <div class="ml-auto flex items-center gap-0.5" role="toolbar" aria-label="设置">
          <UButton v-for="m in [{ mode: 'light' as const, icon: Sun, label: t('theme.light') }, { mode: 'dark' as const, icon: Moon, label: t('theme.dark') }, { mode: 'auto' as const, icon: Monitor, label: t('theme.auto') }]" :key="m.mode" variant="ghost" color="neutral" @click="preference.setThemeMode(m.mode)" class="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200" :class="preference.themeMode === m.mode ? 'bg-secondary-container/60 text-on-secondary-container' : 'text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-variant/60'" :aria-label="m.label" :title="m.label">
            <component :is="m.icon" class="h-4 w-4" aria-hidden="true" />
          </UButton>
          <div class="mx-0.5 h-5 w-px bg-outline-variant/40" />
          <UButton variant="ghost" color="neutral" @click="preference.setLocale(preference.locale === 'zh-CN' ? 'en-US' : 'zh-CN')" class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-variant/60" :title="t('locale.en')">
            {{ preference.locale === 'zh-CN' ? 'EN' : '中' }}
          </UButton>
        </div>
      </header>

      <!-- Local notice -->
      <div class="bg-primary/5 px-4 py-1 text-center text-[11px] font-medium text-primary/70">
        {{ t('app.localNotice') }}
      </div>

      <!-- Content -->
      <main class="flex-1 overflow-hidden">
        <div class="h-full overflow-y-auto p-4 md:p-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>