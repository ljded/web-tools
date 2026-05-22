<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed } from 'vue'
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

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="space-y-6">
    <UCard
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
          <UBadge color="neutral" variant="soft" class="rounded-full bg-surface/80 px-3 py-1 shadow-sm">{{ t('app.badges.localProcessing') }}</UBadge>
          <UBadge color="neutral" variant="soft" class="rounded-full bg-surface/80 px-3 py-1 shadow-sm">{{ t('app.badges.offline') }}</UBadge>
          <UBadge color="neutral" variant="soft" class="rounded-full bg-surface/80 px-3 py-1 shadow-sm">{{ t('app.badges.noExternalDeps') }}</UBadge>
          <UBadge color="neutral" variant="soft" class="rounded-full bg-surface/80 px-3 py-1 shadow-sm">{{ t('app.badges.mobileReady') }}</UBadge>
        </div>
      </div>
    </UCard>

    <div class="flex items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-medium text-on-surface">{{ t('app.allTools') }}</h2>
        <p class="mt-1 text-sm text-on-surface-variant">{{ t('app.chooseTool') }}</p>
      </div>
      <UBadge color="neutral" variant="soft" class="hidden rounded-full bg-surface-variant px-3 py-1 text-xs font-medium text-on-surface-variant sm:inline-flex">
        {{ t('app.toolsCount', { count: toolCards.length }) }}
      </UBadge>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <UButton
        v-for="tool in toolCards"
        :key="tool.path"
        variant="ghost"
        color="neutral"
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
      </UButton>
    </div>
  </div>
</template>
