import { createRouter, createWebHashHistory } from 'vue-router'
import { createToolRoutes } from '@/tools/registry'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
    ...createToolRoutes(),
  ],
})

export default router
