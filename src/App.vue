<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import AppShell from './app/AppShell.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import { usePreferenceStore } from './stores/preference'
import { en, zh_cn } from '@nuxt/ui/locale'

const preference = usePreferenceStore()
const uiLocale = computed(() => (preference.locale === 'zh-CN' ? zh_cn : en))
const toast = useToast()
const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true })
let updateToastShown = false

watch(needRefresh, (needsRefresh) => {
  if (!needsRefresh || updateToastShown) return
  updateToastShown = true
  toast.add({
    title: '检测到新版本',
    color: 'info',
    duration: 0,
    actions: [
      {
        label: '立即刷新',
        async onClick() {
          await updateServiceWorker(true)
        },
      },
    ],
  })
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
