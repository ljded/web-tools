import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'

import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', window.location.href)
    navigator.serviceWorker.register(swUrl, { scope: './' }).catch(() => {
      // 离线缓存是增强能力，注册失败不应影响工具本身使用。
    })
  })
}
