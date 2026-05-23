<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { tools } from '@/tools/registry'

const router = useRouter()
const { t } = useI18n()

const toolCards = computed(() =>
  tools.map((tool) => ({
    ...tool,
    label: t(`${tool.i18nKey}.title`),
    desc: t(`${tool.i18nKey}.desc`),
  })),
)

function go(path: string) { router.push(path) }

function preloadTool(component: () => Promise<unknown>) {
  try { component() } catch { /* silent */ }
}
function preloadAllTools() {
  const schedule = typeof requestIdleCallback !== 'undefined'
    ? (fn: () => void) => requestIdleCallback(fn, { timeout: 3000 })
    : (fn: () => void) => setTimeout(fn, 200)
  schedule(() => { for (const tool of tools) schedule(() => preloadTool(tool.component)) })
}
onMounted(preloadAllTools)
</script>

<template>
  <div class="space-y-8">
    <!-- Hero -->
    <UCard
      variant="subtle"
      :ui="{ root: 'overflow-hidden rounded-3xl border-0 shadow-sm', body: 'p-6 md:p-10' }"
    >
      <div class="max-w-3xl">
        <UBadge
          color="primary"
          variant="soft"
          class="mb-4 rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase"
        >
          {{ t('app.tagline') }}
        </UBadge>
        <h1 class="text-3xl font-bold tracking-tight text-highlighted md:text-4xl lg:text-5xl">
          {{ t('app.heroTitle') }}
        </h1>
        <p class="mt-4 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
          {{ t('app.heroDesc') }}
        </p>
        <div class="mt-6 flex flex-wrap gap-2">
          <UBadge
            v-for="b in ['localProcessing', 'offline', 'noExternalDeps', 'mobileReady']"
            :key="b"
            color="neutral"
            variant="soft"
            class="rounded-full px-3 py-1 text-xs font-medium"
          >
            {{ t(`app.badges.${b}`) }}
          </UBadge>
        </div>
      </div>
    </UCard>

    <!-- Section header -->
    <div class="flex items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">{{ t('app.allTools') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ t('app.chooseTool') }}</p>
      </div>
      <UBadge
        color="neutral"
        variant="soft"
        class="hidden rounded-full px-3 py-1 text-xs font-medium sm:inline-flex"
      >
        {{ t('app.toolsCount', { count: toolCards.length }) }}
      </UBadge>
    </div>

    <!-- Tool grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <UCard
        v-for="tool in toolCards"
        :key="tool.path"
        variant="outline"
        :ui="{ root: 'cursor-pointer rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md', body: 'p-5' }"
        @click="go(tool.path)"
      >
        <div
          class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
          :class="{
            'bg-primary/10 text-primary': tool.color === 'primary',
            'bg-secondary/10 text-secondary': tool.color === 'secondary',
            'bg-success/10 text-success': tool.color === 'success',
            'bg-info/10 text-info': tool.color === 'info',
            'bg-warning/10 text-warning': tool.color === 'warning',
            'bg-error/10 text-error': tool.color === 'error',
            'bg-neutral/10 text-muted': tool.color === 'neutral',
          }"
        >
          <UIcon :name="tool.icon" class="size-6" />
        </div>
        <h3 class="text-base font-semibold text-highlighted">{{ tool.label }}</h3>
        <p class="mt-1 text-sm text-muted">{{ tool.desc }}</p>
      </UCard>
    </div>
  </div>
</template>
