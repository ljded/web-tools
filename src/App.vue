<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useI18n } from 'vue-i18n'
import AppShell from './app/AppShell.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import { usePreferenceStore } from './stores/preference'
import { en, zh_cn } from '@nuxt/ui/locale'
import { performanceMonitor } from './utils/performance'

const preference = usePreferenceStore()
const { t } = useI18n()
const router = useRouter()
const uiLocale = computed(() => (preference.locale === 'zh-CN' ? zh_cn : en))
const toast = useToast()
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000
const swListeners: Array<() => void> = []

onMounted(() => {
  // 仅在开发环境定期打印性能报告
  if (import.meta.env.DEV) {
    const reportInterval = setInterval(() => {
      const metrics = performanceMonitor.getMetrics()
      // 只有在有指标时才打印
      if (metrics.largestContentfulPaint || metrics.firstContentfulPaint) {
        console.log(performanceMonitor.getReport())
      }
    }, 60000) // 每分钟打印一次

    swListeners.push(() => clearInterval(reportInterval))
  }
})

// 路由切换时记录性能
router.afterEach((to) => {
  performanceMonitor.mark(`route-${String(to.name)}`)
})

const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    const checkForUpdate = () => {
      if (navigator.onLine) void registration.update()
    }

    checkForUpdate()
    window.addEventListener('online', checkForUpdate)
    const timer = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL)
    swListeners.push(() => window.removeEventListener('online', checkForUpdate), () => window.clearInterval(timer))
  },
})
let updateToastShown = false

watch(needRefresh, (needsRefresh) => {
  if (!needsRefresh || updateToastShown) return
  updateToastShown = true
  toast.add({
    title: t('app.appUpdateTitle'),
    description: t('app.appUpdateDesc'),
    color: 'info',
    duration: 0,
    actions: [
      {
        label: t('app.refreshNow'),
        async onClick() {
          await updateServiceWorker(true)
        },
      },
    ],
  })
})

onBeforeUnmount(() => {
  for (const cleanup of swListeners) cleanup()
  swListeners.length = 0
})

</script>

<template>
  <UApp :locale="uiLocale">
    <AppShell>
      <ErrorBoundary>
        <RouterView />
      </ErrorBoundary>
    </AppShell>
  </UApp>
</template>
