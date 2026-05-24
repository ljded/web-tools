<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppShell from './app/AppShell.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import { usePreferenceStore } from './stores/preference'
import { en, zh_cn } from '@nuxt/ui/locale'

const preference = usePreferenceStore()
const uiLocale = computed(() => (preference.locale === 'zh-CN' ? zh_cn : en))

// PWA 更新提示
onMounted(() => {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready.then((reg) => {
    if (reg.waiting) promptUpdate(reg.waiting)
    reg.addEventListener('updatefound', () => {
      const installing = reg.installing
      if (!installing) return
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          promptUpdate(installing)
        }
      })
    })
  })
})

function promptUpdate(worker: ServiceWorker) {
  const toast = useToast()
  toast.add({
    title: '检测到新版本',
    color: 'info',
    duration: 0,
    actions: [
      {
        label: '立即刷新',
        onClick() {
          worker.postMessage({ type: 'SKIP_WAITING' })
          window.location.reload()
        },
      },
    ],
  })
}
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
