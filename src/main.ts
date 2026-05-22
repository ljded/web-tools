import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import NuxtUI from '@nuxt/ui/vue-plugin'

import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(NuxtUI)

app.mount('#app')

// ── PWA 更新提示 ──────────────────────────────────────
// 当检测到新版本 waiting 时提示用户刷新
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    if (reg.waiting) {
      promptUpdate(reg.waiting)
    }
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
}

async function promptUpdate(worker: ServiceWorker) {
  try {
    const { useSnackbarStore } = await import('@/stores/snackbar')
    const snackbar = useSnackbarStore()
    snackbar.open({
      message: '检测到新版本',
      type: 'info',
      duration: 0,
      action: {
        label: '立即刷新',
        handler() {
          worker.postMessage({ type: 'SKIP_WAITING' })
          window.location.reload()
        },
      },
    })
  } catch {
    if (confirm('检测到新版本，是否立即刷新？')) {
      worker.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }
}
