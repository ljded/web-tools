import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import { createToolRoutes } from '@/tools/registry'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'home', component: Home },
    ...createToolRoutes(),
  ],
})

export default router
