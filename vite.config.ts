import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import NuxtUI from '@nuxt/ui/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

const usedLucideIconsModuleId = 'virtual:used-lucide-icons'
const resolvedUsedLucideIconsModuleId = `\0${usedLucideIconsModuleId}`
const sourceRoot = fileURLToPath(new URL('./src', import.meta.url))
const lucideIconsPath = fileURLToPath(
  new URL('./node_modules/@iconify-json/lucide/icons.json', import.meta.url),
)
const sourceExtensions = new Set(['.ts', '.vue'])

type IconifyAlias = { parent: string }

type IconifyCollection = {
  prefix: string
  icons: Record<string, unknown>
  aliases?: Record<string, IconifyAlias>
  lastModified?: number
  width?: number
  height?: number
}

function walkSourceFiles(root: string): string[] {
  if (!existsSync(root)) return []
  const files: string[] = []
  const walk = (current: string) => {
    const stat = statSync(current)
    if (stat.isDirectory()) {
      for (const entry of readdirSync(current)) walk(join(current, entry))
      return
    }
    if (sourceExtensions.has(extname(current))) files.push(current)
  }
  walk(root)
  return files
}

function collectUsedLucideIconNames(): string[] {
  const names = new Set<string>()
  const iconPattern = /\bi-lucide-([a-z0-9]+(?:-[a-z0-9]+)*)\b/g

  for (const file of walkSourceFiles(sourceRoot)) {
    const content = readFileSync(file, 'utf8')
    for (const match of content.matchAll(iconPattern)) {
      if (match[1]) names.add(match[1])
    }
  }

  return [...names].sort()
}

function addIconWithAliasParents(
  collection: IconifyCollection,
  name: string,
  icons: Record<string, unknown>,
  aliases: Record<string, IconifyAlias>,
) {
  if (collection.icons[name]) {
    icons[name] = collection.icons[name]
    return
  }

  const alias = collection.aliases?.[name]
  if (!alias) {
    console.warn(`[used-lucide-icons] 未在 @iconify-json/lucide 中找到图标：${name}`)
    return
  }

  aliases[name] = alias
  addIconWithAliasParents(collection, alias.parent, icons, aliases)
}

function createUsedLucideIconsModule(): string {
  const collection = JSON.parse(readFileSync(lucideIconsPath, 'utf8')) as IconifyCollection
  const icons: Record<string, unknown> = {}
  const aliases: Record<string, IconifyAlias> = {}

  for (const name of collectUsedLucideIconNames()) {
    addIconWithAliasParents(collection, name, icons, aliases)
  }

  const usedCollection: IconifyCollection = {
    prefix: collection.prefix,
    icons,
    lastModified: collection.lastModified,
    width: collection.width,
    height: collection.height,
  }
  if (Object.keys(aliases).length) usedCollection.aliases = aliases

  return `export default ${JSON.stringify(usedCollection)}`
}

function usedLucideIconsPlugin(): Plugin {
  return {
    name: 'web-tools-used-lucide-icons',
    resolveId(id) {
      if (id === usedLucideIconsModuleId) return resolvedUsedLucideIconsModuleId
    },
    load(id) {
      if (id === resolvedUsedLucideIconsModuleId) return createUsedLucideIconsModule()
    },
    handleHotUpdate(ctx) {
      if (!ctx.file.startsWith(sourceRoot)) return
      const mod = ctx.server.moduleGraph.getModuleById(resolvedUsedLucideIconsModuleId)
      if (mod) ctx.server.moduleGraph.invalidateModule(mod)
    },
  }
}

function mermaidChunkName(normalized: string) {
  if (normalized.includes('node_modules/mermaid/dist/chunks/')) {
    const name = basename(normalized)
      .replace(/\.(mjs|js)$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
    return `vendor-mermaid-${name}`
  }
  if (normalized.includes('node_modules/mermaid/')) return 'vendor-mermaid-core'
  if (
    normalized.includes('node_modules/cytoscape') ||
    normalized.includes('node_modules/dagre-d3-es') ||
    normalized.includes('node_modules/graphlib')
  )
    return 'vendor-mermaid-layout'
  if (normalized.includes('node_modules/roughjs')) return 'vendor-mermaid-rough'
  if (normalized.includes('node_modules/d3')) return 'vendor-mermaid-d3'
  if (
    normalized.includes('node_modules/dompurify') ||
    normalized.includes('node_modules/marked') ||
    normalized.includes('node_modules/stylis')
  )
    return 'vendor-mermaid-markdown'
}

export default defineConfig(({ command }) => ({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
  },
  plugins: [
    usedLucideIconsPlugin(),
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
        maximumFileSizeToCacheInBytes: 1536 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest,woff2,mjs,ttf}'],
        globIgnores: [
          'apps/**/*',
          'assets/vendor-*.js',
          'assets/*worker*.js',
          'assets/*worker*.mjs',
        ],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/apps\//],
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin &&
              (request.destination === 'script' ||
                request.destination === 'style' ||
                request.destination === 'worker'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'web-tools-runtime-code',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin && (request.destination === 'image' || request.destination === 'font'),
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
      ? [
          visualizer({
            open: false,
            gzipSize: true,
            brotliSize: true,
            filename: 'dist/stats.html',
          }),
        ]
      : []),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      {
        find: '@iconify/vue',
        replacement: fileURLToPath(
          new URL('./node_modules/@iconify/vue/dist/offline.mjs', import.meta.url),
        ),
      },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')
          if (normalized.includes('node_modules/monaco-editor/esm/vs/language/typescript'))
            return 'vendor-monaco-typescript'
          if (
            normalized.includes('node_modules/monaco-editor') ||
            normalized.includes('/components/MonacoEditor')
          )
            return 'vendor-monaco'
          if (
            normalized.includes('node_modules/pdfjs-dist') ||
            normalized.includes('node_modules/pdf-lib')
          )
            return 'vendor-pdf'
          if (
            normalized.includes('node_modules/crypto-js') ||
            normalized.includes('node_modules/jose') ||
            normalized.includes('node_modules/jsencrypt') ||
            normalized.includes('node_modules/sm-crypto') ||
            normalized.includes('node_modules/bcryptjs')
          )
            return 'vendor-crypto'
          if (normalized.includes('node_modules/@faker-js')) return 'vendor-faker'
          if (
            normalized.includes('node_modules/qrcode') ||
            normalized.includes('node_modules/jsqr') ||
            normalized.includes('node_modules/browser-image-compression')
          )
            return 'vendor-media'
          // Mermaid 自身使用按需 diagram chunks，不强制合并，避免破坏其懒加载边界。
          const mermaidChunk = mermaidChunkName(normalized)
          if (mermaidChunk) return mermaidChunk
          if (normalized.includes('node_modules/katex')) return 'vendor-katex'
        },
      },
    },
  },
}))
