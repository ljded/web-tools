<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { tools } from '@/tools/registry'
import { preloadToolByName, startBackgroundPreloadAllTools } from '@/tools/preload'
import { searchTools } from '@/tools/search'
import { usePersistedRef } from '@/utils/persist'

const FAVORITE_TOOLS_KEY = 'web-tools:favorite-tools'
const RECENT_TOOLS_KEY = 'web-tools:recent-tools'

const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const search = ref('')
const favoriteTools = usePersistedRef<string[]>(FAVORITE_TOOLS_KEY, [])
const recentTools = usePersistedRef<string[]>(RECENT_TOOLS_KEY, [])

const toolCards = computed(() =>
  searchTools(t, search.value).map(({ tool, label, description }) => ({
    ...tool,
    label,
    desc: description,
  })),
)

const favoriteCards = computed(() =>
  favoriteTools.value
    .map((name) => toolCards.value.find((tool) => tool.name === name) ?? tools.find((tool) => tool.name === name))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool))
    .map((tool) => ({
      ...tool,
      label: t(`${tool.i18nKey}.title`),
      desc: t(`${tool.i18nKey}.desc`),
    })),
)

const recentCards = computed(() =>
  recentTools.value
    .map((name) => tools.find((tool) => tool.name === name))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool))
    .slice(0, 6)
    .map((tool) => ({
      ...tool,
      label: t(`${tool.i18nKey}.title`),
      desc: t(`${tool.i18nKey}.desc`),
    })),
)

const stats = computed(() => [
  { label: t('app.stats.tools'), value: tools.length, icon: 'i-lucide-layout-grid' },
  { label: t('app.stats.offline'), value: tools.filter((tool) => tool.capabilities?.includes('offline')).length, icon: 'i-lucide-wifi-off' },
  { label: t('app.stats.workers'), value: tools.filter((tool) => tool.capabilities?.includes('worker')).length, icon: 'i-lucide-cpu' },
])

function go(path: string) { router.push(path) }

function isFavorite(name: string) {
  return favoriteTools.value.includes(name)
}

function toggleFavorite(name: string) {
  if (favoriteTools.value.includes(name)) {
    favoriteTools.value = favoriteTools.value.filter((item) => item !== name)
    return
  }
  favoriteTools.value = [name, ...favoriteTools.value].slice(0, 10)
}

onMounted(() => {
  startBackgroundPreloadAllTools().then(({ loaded, failed }) => {
    if (!loaded && !failed) return

    toast.add({
      title: t('app.preloadDoneTitle'),
      description: failed
        ? t('app.preloadDoneWithFail', { loaded, failed })
        : t('app.preloadDoneSuccess', { loaded }),
      color: failed ? 'warning' : 'success',
      icon: failed ? 'i-lucide-triangle-alert' : 'i-lucide-check-circle',
    })
  })
})
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-8">
    <section class="relative overflow-hidden rounded-[2rem] border border-default/70 bg-elevated/80 p-6 shadow-xl shadow-default/10 backdrop-blur md:p-10">
      <div class="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div class="pointer-events-none absolute bottom-0 right-20 h-48 w-48 rounded-full bg-secondary/18 blur-3xl" />

      <div class="relative grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <UBadge
            color="primary"
            variant="soft"
            class="mb-5 rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase"
          >
            {{ t('app.tagline') }}
          </UBadge>
          <h1 class="max-w-3xl text-4xl font-black tracking-tight text-highlighted md:text-5xl lg:text-6xl">
            {{ t('app.heroTitle') }}
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-8 text-muted md:text-lg">
            {{ t('app.heroDesc') }}
          </p>

          <div class="mt-7 flex flex-wrap gap-2">
            <UBadge
              v-for="b in ['localProcessing', 'offline', 'noExternalDeps', 'mobileReady']"
              :key="b"
              color="neutral"
              variant="soft"
              class="rounded-full px-3 py-1 text-xs font-semibold"
            >
              {{ t(`app.badges.${b}`) }}
            </UBadge>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <div
            v-for="item in stats"
            :key="item.label"
            class="rounded-3xl border border-default bg-default/70 p-4 shadow-sm"
          >
            <div class="flex items-center gap-3 lg:justify-between">
              <UIcon :name="item.icon" class="size-5 text-primary" />
              <div class="text-2xl font-black text-highlighted">{{ item.value }}</div>
            </div>
            <div class="mt-1 text-xs font-medium uppercase tracking-wider text-muted">{{ item.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="favoriteCards.length || recentCards.length" class="grid gap-4 lg:grid-cols-2">
      <UCard
        v-if="favoriteCards.length"
        variant="subtle"
        :ui="{ root: 'rounded-3xl border-default/70 bg-elevated/75', body: 'p-5' }"
      >
        <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-highlighted">
          <UIcon name="i-lucide-star" class="size-4 text-warning" />
          {{ t('app.favorites') }}
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="tool in favoriteCards"
            :key="tool.name"
            color="neutral"
            variant="soft"
            size="sm"
            class="rounded-full"
            @click="go(tool.path)"
          >
            <UIcon :name="tool.icon" class="size-4" />
            {{ tool.label }}
          </UButton>
        </div>
      </UCard>

      <UCard
        v-if="recentCards.length"
        variant="subtle"
        :ui="{ root: 'rounded-3xl border-default/70 bg-elevated/75', body: 'p-5' }"
      >
        <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-highlighted">
          <UIcon name="i-lucide-history" class="size-4 text-primary" />
          {{ t('app.recent') }}
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="tool in recentCards"
            :key="tool.name"
            color="neutral"
            variant="soft"
            size="sm"
            class="rounded-full"
            @click="go(tool.path)"
          >
            <UIcon :name="tool.icon" class="size-4" />
            {{ tool.label }}
          </UButton>
        </div>
      </UCard>
    </section>

    <section class="space-y-5">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-highlighted">{{ t('app.allTools') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ t('app.chooseTool') }}</p>
        </div>
        <UBadge
          color="neutral"
          variant="soft"
          class="w-fit rounded-full px-3 py-1 text-xs font-semibold"
        >
          {{ t('app.toolsCount', { count: toolCards.length }) }}
        </UBadge>
      </div>

      <div class="rounded-3xl border border-default/70 bg-elevated/70 p-2 shadow-lg shadow-default/5 backdrop-blur">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          :placeholder="t('app.searchTools')"
          size="xl"
          variant="ghost"
          class="w-full"
          :ui="{ base: 'rounded-2xl text-base', leadingIcon: 'size-5 text-primary' }"
        />
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <UCard
          v-for="tool in toolCards"
          :key="tool.path"
          variant="subtle"
          class="group"
          :ui="{ root: 'cursor-pointer overflow-hidden rounded-3xl border-default/70 bg-elevated/75 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10', body: 'p-5' }"
          @pointerenter="preloadToolByName(tool.name)"
          @focusin="preloadToolByName(tool.name)"
          @click="go(tool.path)"
        >
          <div class="mb-4 flex items-start justify-between gap-3">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110"
              :class="{
                'bg-primary/10 text-primary': tool.color === 'primary',
                'bg-secondary/10 text-secondary': tool.color === 'secondary',
                'bg-success/10 text-success': tool.color === 'success',
                'bg-info/10 text-info': tool.color === 'info',
                'bg-warning/10 text-warning': tool.color === 'warning',
                'bg-error/10 text-error': tool.color === 'error',
                'bg-default text-default': tool.color === 'neutral',
              }"
            >
              <UIcon :name="tool.icon" class="size-6" />
            </div>
            <div class="flex items-center gap-1">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                class="rounded-full"
                :icon="isFavorite(tool.name) ? 'i-lucide-star' : 'i-lucide-star-off'"
                @click.stop="toggleFavorite(tool.name)"
              />
              <UIcon name="i-lucide-arrow-up-right" class="size-4 text-dimmed transition-colors group-hover:text-primary" />
            </div>
          </div>
          <h3 class="text-base font-bold text-highlighted">{{ tool.label }}</h3>
          <p class="mt-2 min-h-10 text-sm leading-5 text-muted">{{ tool.desc }}</p>
          <div class="mt-4 flex flex-wrap gap-1.5">
            <UBadge
              v-for="capability in (tool.capabilities || []).slice(0, 3)"
              :key="capability"
              color="neutral"
              variant="soft"
              size="xs"
              class="rounded-full"
            >
              {{ capability }}
            </UBadge>
          </div>
        </UCard>
      </div>
    </section>
  </div>
</template>
