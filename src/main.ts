import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { addCollection } from '@iconify/vue'
import lucideIcons from '@iconify-json/lucide/icons.json'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import NuxtUI from '@nuxt/ui/vue-plugin'
import { installSameOriginNetworkGuard } from './security/sameOriginNetwork'
import { installRouteSeo } from './utils/seo'

import './style.css'

// 将 lucide 图标集注册到本地存储，避免运行时从 CDN 加载
// 保持所有资源请求同源
addCollection(lucideIcons)
addCollection(lucideIcons, 'lucide-')

installSameOriginNetworkGuard()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
installRouteSeo(router)
app.use(NuxtUI)

app.mount('#app')
