<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Hash,
  Braces,
  Code,
  Clock,
  QrCode,
  Type,
  Shuffle,
  Lock,
  Regex,
  Image,
  Palette,
  FileDiff,
  FileText,
} from '@lucide/vue'

const router = useRouter()
const { t } = useI18n()

const tools = computed(() => [
  {
    path: '/hash',
    label: t('tools.hash.title'),
    desc: t('tools.hash.desc'),
    icon: Hash,
    color: 'bg-red-100 text-red-700',
  },
  {
    path: '/json',
    label: t('tools.json.title'),
    desc: t('tools.json.desc'),
    icon: Braces,
    color: 'bg-blue-100 text-blue-700',
  },
  {
    path: '/base64',
    label: t('tools.base64.title'),
    desc: t('tools.base64.desc'),
    icon: Code,
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    path: '/timestamp',
    label: t('tools.timestamp.title'),
    desc: t('tools.timestamp.desc'),
    icon: Clock,
    color: 'bg-amber-100 text-amber-700',
  },
  {
    path: '/qrcode',
    label: t('tools.qrcode.title'),
    desc: t('tools.qrcode.desc'),
    icon: QrCode,
    color: 'bg-indigo-100 text-indigo-700',
  },
  {
    path: '/encoding',
    label: t('tools.encoding.title'),
    desc: t('tools.encoding.desc'),
    icon: Type,
    color: 'bg-cyan-100 text-cyan-700',
  },
  {
    path: '/random',
    label: t('tools.random.title'),
    desc: t('tools.random.desc'),
    icon: Shuffle,
    color: 'bg-violet-100 text-violet-700',
  },
  {
    path: '/crypto',
    label: t('tools.crypto.title'),
    desc: t('tools.crypto.desc'),
    icon: Lock,
    color: 'bg-rose-100 text-rose-700',
  },
  {
    path: '/regex',
    label: t('tools.regex.title'),
    desc: t('tools.regex.desc'),
    icon: Regex,
    color: 'bg-orange-100 text-orange-700',
  },
  {
    path: '/image',
    label: t('tools.image.title'),
    desc: t('tools.image.desc'),
    icon: Image,
    color: 'bg-teal-100 text-teal-700',
  },
  {
    path: '/color',
    label: t('tools.color.title'),
    desc: t('tools.color.desc'),
    icon: Palette,
    color: 'bg-pink-100 text-pink-700',
  },
  {
    path: '/diff',
    label: t('tools.diff.title'),
    desc: t('tools.diff.desc'),
    icon: FileDiff,
    color: 'bg-slate-100 text-slate-700',
  },
  {
    path: '/pdf',
    label: t('tools.pdf.title'),
    desc: t('tools.pdf.desc'),
    icon: FileText,
    color: 'bg-red-100 text-red-700',
  },
])

function go(path: string) {
  router.push(path)
}

</script>

<template>
  <div class="space-y-6">
    <section
      class="overflow-hidden rounded-3xl bg-gradient-to-br from-primary-container via-surface to-tertiary-container p-6 shadow-sm outline outline-1 outline-outline-variant md:p-8"
    >
      <div class="max-w-3xl">
        <p class="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          {{ t('app.tagline') }}
        </p>
        <h2 class="text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
          {{ t('app.heroTitle') }}
        </h2>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant md:text-base">
          {{ t('app.heroDesc') }}
        </p>
        <div class="mt-5 flex flex-wrap gap-2 text-xs font-medium text-on-surface-variant">
          <span class="rounded-full bg-surface/80 px-3 py-1 shadow-sm">{{ t('app.badges.localProcessing') }}</span>
          <span class="rounded-full bg-surface/80 px-3 py-1 shadow-sm">{{ t('app.badges.offline') }}</span>
          <span class="rounded-full bg-surface/80 px-3 py-1 shadow-sm">{{ t('app.badges.noExternalDeps') }}</span>
          <span class="rounded-full bg-surface/80 px-3 py-1 shadow-sm">{{ t('app.badges.mobileReady') }}</span>
        </div>
      </div>
    </section>

    <div class="flex items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-medium text-on-surface">{{ t('app.allTools') }}</h2>
        <p class="mt-1 text-sm text-on-surface-variant">
          {{ t('app.chooseTool') }}
        </p>
      </div>
      <span
        class="hidden rounded-full bg-surface-variant px-3 py-1 text-xs font-medium text-on-surface-variant sm:inline-flex"
      >
        {{ t('app.toolsCount', { count: tools.length }) }}
      </span>
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <button
        v-for="tool in tools"
        :key="tool.path"
        @click="go(tool.path)"
        class="group flex flex-col items-start rounded-2xl bg-surface p-5 text-left shadow-sm outline outline-1 outline-outline-variant transition-all hover:-translate-y-0.5 hover:shadow-md hover:outline-primary/50"
      >
        <div
          class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
          :class="tool.color"
        >
          <component :is="tool.icon" class="h-6 w-6" />
        </div>
        <h3 class="text-lg font-medium text-on-surface">{{ tool.label }}</h3>
        <p class="mt-1 text-sm text-on-surface-variant">{{ tool.desc }}</p>
      </button>
    </div>
  </div>
</template>
