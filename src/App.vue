<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useI18n } from 'vue-i18n'
import AppShell from './app/AppShell.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import { usePreferenceStore } from './stores/preference'
import { en, zh_cn } from '@nuxt/ui/locale'

const preference = usePreferenceStore()
const { t } = useI18n()
const uiLocale = computed(() => (preference.locale === 'zh-CN' ? zh_cn : en))
const toast = useToast()
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000
const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    const checkForUpdate = () => {
      if (navigator.onLine) void registration.update()
    }

    checkForUpdate()
    window.addEventListener('online', checkForUpdate)
    window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL)
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
