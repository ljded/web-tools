import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import NuxtUI from '@nuxt/ui/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ command }) => ({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
  },
  plugins: [
    vue(),
    NuxtUI({
      ui: {
        colors: {
          primary: 'blue',
          secondary: 'violet',
          neutral: 'slate',
        },
      },
      colorMode: true,
    }),
    tailwindcss(),
    ...(command === 'serve' ? [vueDevTools()] : []),
    VitePWA({
      registerType: 'prompt',
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'Web Tools',
        short_name: 'Web Tools',
        description: '本地优先、可离线回访的网页工具集',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f2f2f7',
        theme_color: '#007aff',
        icons: [
          { src: './icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: './favicon.ico', sizes: '48x48', type: 'image/x-icon' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest,woff2,mjs,ttf}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin &&
              (request.destination === 'image' || request.destination === 'font'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'web-tools-static',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
    ...(process.env.ANALYZE === 'true'
      ? [visualizer({
          open: false,
          gzipSize: true,
          brotliSize: true,
          filename: 'dist/stats.html',
        })]
      : []),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: '@iconify/vue', replacement: fileURLToPath(new URL('./node_modules/@iconify/vue/dist/offline.mjs', import.meta.url)) },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')
          if (normalized.includes('node_modules/monaco-editor') || normalized.includes('/components/MonacoEditor')) return 'vendor-monaco'
          if (normalized.includes('node_modules/pdfjs-dist') || normalized.includes('node_modules/pdf-lib')) return 'vendor-pdf'
          if (
            normalized.includes('node_modules/crypto-js') ||
            normalized.includes('node_modules/jose') ||
            normalized.includes('node_modules/jsencrypt') ||
            normalized.includes('node_modules/sm-crypto') ||
            normalized.includes('node_modules/bcryptjs')
          ) return 'vendor-crypto'
          if (normalized.includes('node_modules/@faker-js')) return 'vendor-faker'
          if (
            normalized.includes('node_modules/qrcode') ||
            normalized.includes('node_modules/jsqr') ||
            normalized.includes('node_modules/browser-image-compression')
          ) return 'vendor-media'
        },
      },
    },
  },
}))
