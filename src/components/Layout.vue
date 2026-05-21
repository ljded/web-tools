<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Home,
  Hash,
  Braces,
  Code,
  Clock,
  QrCode,
  Type,
  Shuffle,
  Lock,
  Regex,
  Image,
  Palette,
  FileDiff,
  FileText,
  Menu,
  ChevronLeft,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
} from '@lucide/vue'
import { useThemeStore } from '@/stores/theme'
import { useLocaleStore } from '@/stores/locale'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const drawerOpen = ref(false)
const theme = useThemeStore()
const locale = useLocaleStore()
const { t } = useI18n()

const homeItem = computed(() => ({ path: '/', label: t('nav.home'), icon: Home }))

const groups = computed(() => [
  {
    label: t('nav.groups.common'),
    items: [
      { path: '/hash', label: t('tools.hash.title'), icon: Hash },
      { path: '/timestamp', label: t('tools.timestamp.title'), icon: Clock },
      { path: '/qrcode', label: t('tools.qrcode.title'), icon: QrCode },
      { path: '/random', label: t('tools.random.title'), icon: Shuffle },
      { path: '/color', label: t('tools.color.title'), icon: Palette },
    ],
  },
  {
    label: t('nav.groups.text'),
    items: [
      { path: '/base64', label: 'Base64', icon: Code },
      { path: '/encoding', label: t('tools.encoding.title'), icon: Type },
      { path: '/json', label: t('tools.json.title'), icon: Braces },
      { path: '/regex', label: t('tools.regex.title'), icon: Regex },
      { path: '/diff', label: t('tools.diff.title'), icon: FileDiff },
    ],
  },
  {
    label: t('nav.groups.security'),
    items: [
      { path: '/crypto', label: t('tools.crypto.title'), icon: Lock },
      { path: '/image', label: t('tools.image.title'), icon: Image },
      { path: '/pdf', label: t('tools.pdf.title'), icon: FileText },
    ],
  },
])

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

function goTo(path: string) {
  router.push(path)
  drawerOpen.value = false
}
</script>

<template>
  <div class="flex h-screen bg-surface">
    <!-- 侧边导航栏 -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col bg-surface shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-none md:bg-surface-variant/30"
      :class="drawerOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-14 items-center px-4 md:hidden">
        <button
          @click="drawerOpen = false"
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
        >
          <ChevronLeft class="h-6 w-6 text-on-surface" />
        </button>
        <span class="ml-2 text-xl font-medium text-on-surface">Web Tools</span>
      </div>
      <div class="hidden h-14 items-center px-5 md:flex">
        <div>
          <div class="text-xl font-semibold tracking-tight text-primary">{{ t('app.title') }}</div>
          <div class="text-xs font-medium text-on-surface-variant">{{ t('app.subtitle') }}</div>
        </div>
      </div>
      <nav class="flex-1 space-y-1 overflow-y-auto px-2 py-2 md:px-2">
        <button
          @click="goTo(homeItem.path)"
          class="flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors"
          :class="
            route.path === homeItem.path
              ? 'bg-secondary-container text-on-secondary-container'
              : 'text-on-surface-variant hover:bg-surface-variant'
          "
        >
          <component :is="homeItem.icon" class="h-4.5 w-4.5" />
          {{ homeItem.label }}
        </button>
        <div v-for="group in groups" :key="group.label" class="mb-1">
          <button
            @click="expanded[group.label] = !expanded[group.label]"
            class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-variant/50"
          >
            {{ group.label }}
            <ChevronDown
              class="h-4 w-4 transition-transform"
              :class="expanded[group.label] ? 'rotate-180' : ''"
            />
          </button>
          <div v-show="expanded[group.label]" class="mt-0.5 space-y-0.5">
            <button
              v-for="item in group.items"
              :key="item.path"
              @click="goTo(item.path)"
              class="flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors"
              :class="
                route.path === item.path
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-variant'
              "
            >
              <component :is="item.icon" class="h-4.5 w-4.5" />
              {{ item.label }}
            </button>
          </div>
        </div>
      </nav>
    </aside>

    <!-- 遮罩层 -->
    <div
      v-if="drawerOpen"
      class="fixed inset-0 z-40 bg-black/30 md:hidden"
      @click="drawerOpen = false"
    />

    <!-- 主内容区 -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- 顶部 AppBar -->
      <header class="flex h-16 items-center gap-4 bg-surface px-4 shadow-sm">
        <button
          @click="drawerOpen = true"
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-variant transition-colors md:hidden"
        >
          <Menu class="h-6 w-6 text-on-surface" />
        </button>
        <h1 class="text-xl font-medium text-on-surface">{{ currentTitle }}</h1>
        <div class="ml-auto flex items-center gap-1">
          <a
            href="https://github.com/ljded/web-tools"
            target="_blank"
            rel="noopener noreferrer"
            class="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant"
            aria-label="GitHub repository"
            title="GitHub"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.38 6.84 9.74.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.93.86.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.99c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.38-.01 2.49-.01 2.82 0 .27.18.59.69.49A10.11 10.11 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
              />
            </svg>
          </a>
          <button
            @click="theme.mode = 'light'"
            class="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            :class="
              theme.mode === 'light'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-variant'
            "
            :title="t('theme.light')"
          >
            <Sun class="h-4 w-4" />
          </button>
          <button
            @click="theme.mode = 'dark'"
            class="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            :class="
              theme.mode === 'dark'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-variant'
            "
            :title="t('theme.dark')"
          >
            <Moon class="h-4 w-4" />
          </button>
          <button
            @click="theme.mode = 'auto'"
            class="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            :class="
              theme.mode === 'auto'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-variant'
            "
            :title="t('theme.auto')"
          >
            <Monitor class="h-4 w-4" />
          </button>
          <button
            @click="locale.setLocale(locale.locale === 'zh-CN' ? 'en-US' : 'zh-CN')"
            class="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors"
            :class="
              'text-on-surface-variant hover:bg-surface-variant'
            "
            :title="t('locale.en')"
          >
            {{ locale.locale === 'zh-CN' ? 'EN' : '中' }}
          </button>
        </div>
      </header>

      <!-- 本地运行提示 -->
      <div
        class="bg-primary-container px-4 py-1.5 text-center text-[11px] font-medium text-on-primary-container"
      >
        {{ t('app.localNotice') }}
      </div>
      <!-- 内容 -->
      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
