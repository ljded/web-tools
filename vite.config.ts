import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import NuxtUI from '@nuxt/ui/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    NuxtUI({
      ui: {
        colors: {
          primary: 'blue',
          neutral: 'zinc',
        },
      },
    }),
    tailwindcss(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Web Tools',
        short_name: 'Web Tools',
        description: '本地优先、可离线回访的网页工具集。',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#fef7ff',
        theme_color: '#6750a4',
        icons: [
          {
            src: './icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: './favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest,woff2,mjs,ttf}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === 'image' || request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'web-tools-static',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/views/crypto/')) return 'tools-crypto'
          if (id.includes('/src/views/media/')) return 'tools-media'
          if (id.includes('/src/views/text/')) return 'tools-text'
          if (id.includes('/src/views/dev/')) return 'tools-dev'
          if (id.includes('monaco-editor') || id.includes('/components/MonacoEditor'))
            return 'vendor-monaco'
        },
      },
    },
  },
})
