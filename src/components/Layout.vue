<script setup lang="ts">
import { ref, computed } from 'vue'
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
  Menu,
  ChevronLeft,
  Sun,
  Moon,
  Monitor,
} from '@lucide/vue'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const router = useRouter()
const drawerOpen = ref(false)
const theme = useThemeStore()

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/hash', label: '哈希计算', icon: Hash },
  { path: '/json', label: 'JSON 编辑器', icon: Braces },
  { path: '/base64', label: 'Base64', icon: Code },
  { path: '/timestamp', label: '时间戳', icon: Clock },
  { path: '/qrcode', label: '二维码', icon: QrCode },
  { path: '/encoding', label: '字符编码', icon: Type },
  { path: '/random', label: '随机数据', icon: Shuffle },
  { path: '/crypto', label: '加解密', icon: Lock },
  { path: '/regex', label: '正则表达式', icon: Regex },
  { path: '/image', label: '图片压缩', icon: Image },
]

const currentTitle = computed(() => {
  const item = navItems.find((i) => i.path === route.path)
  return item?.label ?? '工具箱'
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
      class="fixed inset-y-0 left-0 z-50 w-72 transform bg-surface shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-none md:bg-surface-variant/30"
      :class="drawerOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-16 items-center px-4 md:hidden">
        <button
          @click="drawerOpen = false"
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
        >
          <ChevronLeft class="h-6 w-6 text-on-surface" />
        </button>
        <span class="ml-2 text-xl font-medium text-on-surface">工具箱</span>
      </div>
      <div class="hidden h-16 items-center px-6 md:flex">
        <span class="text-2xl font-medium text-primary">WebTools</span>
      </div>
      <nav class="mt-2 space-y-1 px-3">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="goTo(item.path)"
          class="flex w-full items-center gap-4 rounded-full px-4 py-3 text-sm font-medium transition-colors"
          :class="
            route.path === item.path
              ? 'bg-secondary-container text-on-secondary-container'
              : 'text-on-surface-variant hover:bg-surface-variant'
          "
        >
          <component :is="item.icon" class="h-5 w-5" />
          {{ item.label }}
        </button>
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
      <header
        class="flex h-16 items-center gap-4 bg-surface px-4 shadow-sm"
      >
        <button
          @click="drawerOpen = true"
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-variant transition-colors md:hidden"
        >
          <Menu class="h-6 w-6 text-on-surface" />
        </button>
        <h1 class="text-xl font-medium text-on-surface">{{ currentTitle }}</h1>
        <div class="ml-auto flex items-center gap-1">
          <button
            @click="theme.mode = 'light'"
            class="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            :class="theme.mode === 'light' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant'"
            title="浅色"
          >
            <Sun class="h-4 w-4" />
          </button>
          <button
            @click="theme.mode = 'dark'"
            class="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            :class="theme.mode === 'dark' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant'"
            title="深色"
          >
            <Moon class="h-4 w-4" />
          </button>
          <button
            @click="theme.mode = 'auto'"
            class="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            :class="theme.mode === 'auto' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant'"
            title="跟随系统"
          >
            <Monitor class="h-4 w-4" />
          </button>
        </div>
      </header>

      <!-- 内容 -->
      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
