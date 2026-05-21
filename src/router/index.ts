import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '@/views/Home.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/hash', name: 'hash', component: () => import('@/views/Hash.vue') },
    { path: '/json', name: 'json', component: () => import('@/views/JsonEditor.vue') },
    { path: '/base64', name: 'base64', component: () => import('@/views/Base64.vue') },
    { path: '/timestamp', name: 'timestamp', component: () => import('@/views/Timestamp.vue') },
    { path: '/qrcode', name: 'qrcode', component: () => import('@/views/Qrcode.vue') },
    { path: '/encoding', name: 'encoding', component: () => import('@/views/Encoding.vue') },
    { path: '/random', name: 'random', component: () => import('@/views/RandomData.vue') },
    { path: '/crypto', name: 'crypto', component: () => import('@/views/Crypto.vue') },
    { path: '/regex', name: 'regex', component: () => import('@/views/Regex.vue') },
    { path: '/image', name: 'image', component: () => import('@/views/ImageTool.vue') },
    { path: '/pdf', name: 'pdf', component: () => import('@/views/PdfTool.vue') },
    { path: '/color', name: 'color', component: () => import('@/views/ColorTool.vue') },
    { path: '/diff', name: 'diff', component: () => import('@/views/DiffTool.vue') },
  ],
})

export default router
