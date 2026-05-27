<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { domainI18nKeys, offlineTools as registryOfflineTools, toolsByName, type ToolDomain } from '@/tools/registry'
import { getPreloadedToolNames, getPreloadedToolsStorageStatus, preloadToolByName, preloadToolByNameNow, preloadToolsByNamesInBackground } from '@/tools/preload'
import { searchTools } from '@/tools/search'
import { usePersistedRef } from '@/utils/persist'

const FAVORITE_TOOLS_KEY = 'web-tools:favorite-tools'
const RECENT_TOOLS_KEY = 'web-tools:recent-tools'
const OFFLINE_DOWNLOAD_SELECTION_KEY = 'web-tools:offline-download-selection'
const searchInputId = 'home-tool-search'

const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const search = ref('')
const downloadingOfflineTools = ref(false)
const downloadingToolName = ref('')
const offlineFilter = ref<'all' | 'pending' | 'downloaded'>('all')
const downloadedToolNames = ref<Set<string>>(new Set())
const offlineStorageStatus = ref(getPreloadedToolsStorageStatus())
const failedOfflineToolNames = ref<string[]>([])
const offlineDownloadOpen = ref(false)
const favoriteTools = usePersistedRef<string[]>(FAVORITE_TOOLS_KEY, [])
const recentTools = usePersistedRef<string[]>(RECENT_TOOLS_KEY, [])
const selectedOfflineToolNames = usePersistedRef<string[]>(OFFLINE_DOWNLOAD_SELECTION_KEY, [])

const toolCards = computed(() =>
  searchTools(t, search.value, {
    favoriteNames: favoriteTools.value,
    recentNames: recentTools.value,
    preferredCapabilities: ['offline'],
  }).map(({ tool, label, description, path, feature }) => ({
    ...tool,
    path,
    feature,
    label,
    desc: description,
  })),
)

const offlineTools = computed(() => registryOfflineTools)
const offlineToolCards = computed(() => offlineTools.value.map((tool) => ({
  ...tool,
  label: t(`${tool.i18nKey}.title`),
  desc: t(`${tool.i18nKey}.desc`),
})))
const selectedOfflineTools = computed(() => selectedOfflineToolNames.value.filter((name) => toolsByName.get(name)?.capabilities?.includes('offline')))
const pendingOfflineTools = computed(() => offlineTools.value.filter((tool) => !downloadedToolNames.value.has(tool.name)))
const filteredOfflineToolCards = computed(() => offlineToolCards.value.filter((tool) => {
  if (offlineFilter.value === 'pending') return !downloadedToolNames.value.has(tool.name)
  if (offlineFilter.value === 'downloaded') return downloadedToolNames.value.has(tool.name)
  return true
}))
const groupedOfflineToolCards = computed(() => {
  const groups = new Map<ToolDomain, typeof filteredOfflineToolCards.value>()
  for (const tool of filteredOfflineToolCards.value) {
    groups.set(tool.domain, [...(groups.get(tool.domain) ?? []), tool])
  }
  return [...groups.entries()].map(([domain, items]) => ({
    domain,
    label: t(domainI18nKeys[domain]),
    items,
  }))
})
const downloadedOfflineCount = computed(() => offlineTools.value.filter((tool) => downloadedToolNames.value.has(tool.name)).length)
const heavyOfflineToolNames = new Set(['crypto', 'hash', 'json', 'js-sandbox', 'diff', 'qrcode', 'image', 'pdf'])
const heavyOfflineTools = computed(() => offlineToolCards.value.filter((tool) => heavyOfflineToolNames.has(tool.name)))
const lightOfflineTools = computed(() => offlineToolCards.value.filter((tool) => !heavyOfflineToolNames.has(tool.name)))
const failedOfflineToolLabels = computed(() => failedOfflineToolNames.value
  .map((name) => offlineToolCards.value.find((tool) => tool.name === name)?.label ?? name)
  .join(t('app.listSeparator')))
const offlineDownloadProgress = computed(() => {
  if (!offlineTools.value.length) return 0
  return Math.round((downloadedOfflineCount.value / offlineTools.value.length) * 100)
})
const suggestedOfflineToolNames = computed(() => [...new Set([...favoriteTools.value, ...recentTools.value])].filter((name) => toolsByName.get(name)?.capabilities?.includes('offline')))

const favoriteCards = computed(() =>
  favoriteTools.value
    .map((name) => toolsByName.get(name))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool))
    .map((tool) => ({
      ...tool,
      label: t(`${tool.i18nKey}.title`),
      desc: t(`${tool.i18nKey}.desc`),
    })),
)

const recentCards = computed(() =>
  recentTools.value
    .map((name) => toolsByName.get(name))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool))
    .slice(0, 6)
    .map((tool) => ({
      ...tool,
      label: t(`${tool.i18nKey}.title`),
      desc: t(`${tool.i18nKey}.desc`),
    })),
)


function go(path: string) { router.push(path) }

function focusSearch() {
  const input = document.getElementById(searchInputId) as HTMLInputElement | null
  input?.focus({ preventScroll: true })
  input?.select()
}

function handlePageKeydown(event: KeyboardEvent) {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  event.preventDefault()
  focusSearch()
}

function handleToolCardKeydown(event: KeyboardEvent, path: string) {
  if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
  event.preventDefault()
  go(path)
}

function openFirstSearchResult(event: KeyboardEvent) {
  const firstTool = toolCards.value[0]
  if (!firstTool) return
  event.preventDefault()
  go(firstTool.path)
}

function clearSearch() {
  search.value = ''
}

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

function refreshDownloadedTools() {
  offlineStorageStatus.value = getPreloadedToolsStorageStatus()
  downloadedToolNames.value = getPreloadedToolNames()
}

function isOfflineSelected(name: string) {
  return selectedOfflineToolNames.value.includes(name)
}

function isDownloaded(name: string) {
  return downloadedToolNames.value.has(name)
}

function toggleOfflineSelection(name: string) {
  if (selectedOfflineToolNames.value.includes(name)) {
    selectedOfflineToolNames.value = selectedOfflineToolNames.value.filter((item) => item !== name)
    return
  }
  selectedOfflineToolNames.value = [...selectedOfflineToolNames.value, name]
}

function selectAllOfflineTools() {
  selectedOfflineToolNames.value = offlineTools.value.map((tool) => tool.name)
}

function selectPendingOfflineTools() {
  selectedOfflineToolNames.value = pendingOfflineTools.value.map((tool) => tool.name)
}

function selectSuggestedOfflineTools() {
  selectedOfflineToolNames.value = suggestedOfflineToolNames.value.length
    ? suggestedOfflineToolNames.value
    : offlineTools.value.slice(0, 6).map((tool) => tool.name)
}

function clearOfflineSelection() {
  selectedOfflineToolNames.value = []
}

async function downloadOfflineTool(name: string) {
  const tool = offlineToolCards.value.find((item) => item.name === name)
  if (!tool) return

  downloadingToolName.value = name
  try {
    const result = await preloadToolByNameNow(name)
    refreshDownloadedTools()
    toast.add({
      title: result === 'failed' ? t('app.offlineDownload.downloadFailed') : t('app.offlineDownload.toolReady', { name: tool.label }),
      description: result === 'skipped' ? t('app.offlineDownload.skippedDesc') : result === 'loaded' ? t('app.offlineDownload.loadedDesc') : t('app.offlineDownload.failedDesc'),
      color: result === 'failed' ? 'warning' : 'success',
      icon: result === 'failed' ? 'i-lucide-triangle-alert' : 'i-lucide-download-cloud',
    })
  } finally {
    downloadingToolName.value = ''
  }
}

async function downloadOfflineTools(names: string[], emptyMessage: string) {
  if (!names.length) {
    toast.add({
      title: t('app.offlineDownload.selectToolTitle'),
      description: emptyMessage,
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
    })
    return
  }

  downloadingOfflineTools.value = true
  try {
    const { loaded, failed, skipped, failedNames } = await preloadToolsByNamesInBackground(names, names.length)
    failedOfflineToolNames.value = failedNames
    refreshDownloadedTools()
    const failedText = failedNames.length
      ? t('app.offlineDownload.failedTools', { names: failedNames.join(t('app.listSeparator')) })
      : ''
    toast.add({
      title: failed ? t('app.offlineDownload.partialFailed') : t('app.offlineDownload.batchReady'),
      description: t('app.offlineDownload.batchDesc', { loaded, skipped, failed, failedText }),
      color: failed ? 'warning' : 'success',
      icon: failed ? 'i-lucide-triangle-alert' : 'i-lucide-download-cloud',
    })
  } finally {
    downloadingOfflineTools.value = false
  }
}

async function downloadSelectedOfflineTools() {
  await downloadOfflineTools(selectedOfflineTools.value, t('app.offlineDownload.selectToolDesc'))
}

async function downloadPendingOfflineTools() {
  await downloadOfflineTools(pendingOfflineTools.value.map((tool) => tool.name), t('app.offlineDownload.allDownloadedDesc'))
}

async function downloadAllOfflineTools() {
  await downloadOfflineTools(offlineTools.value.map((tool) => tool.name), t('app.offlineDownload.noOfflineToolsDesc'))
}

function handleIntentPreload(name: string) {
  preloadToolByName(name)
  window.setTimeout(refreshDownloadedTools, 1200)
}

onMounted(() => {
  window.addEventListener('keydown', handlePageKeydown)
  refreshDownloadedTools()
  void preloadToolsByNamesInBackground([...favoriteTools.value, ...recentTools.value]).then(refreshDownloadedTools)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handlePageKeydown)
})
</script>

<template>
  <div class="hig-workbench mx-auto max-w-7xl space-y-6 pb-14">
    <section class="hig-panel relative overflow-hidden rounded-[2.5rem] border p-5 sm:p-7 md:p-10">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
      <div class="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/16 blur-3xl" />
      <div class="pointer-events-none absolute bottom-0 right-20 h-48 w-48 rounded-full bg-secondary/14 blur-3xl" />

      <div class="relative flex w-full flex-col gap-7">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <UBadge
            color="primary"
            variant="soft"
            class="w-fit rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase"
          >
            {{ t('app.tagline') }}
          </UBadge>
            <UModal
              v-model:open="offlineDownloadOpen"
              :ui="{
                content: 'hig-modal-surface fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] border shadow-xl',
              }"
            >
              <UButton
                color="primary"
                variant="soft"
                icon="i-lucide-download-cloud"
                class="w-fit shrink-0 rounded-full px-4 py-2 font-semibold xl:mt-2"
              >
                {{ t('app.offlineDownload.trigger') }}
                <UBadge color="success" variant="subtle" size="xs" class="ml-1 rounded-full">
                  {{ downloadedOfflineCount }}/{{ offlineTools.length }}
                </UBadge>
              </UButton>

              <template #content>
                <div class="max-h-[82vh] overflow-auto p-4 md:p-6">
                  <div class="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div class="flex items-center gap-2 text-lg font-bold text-highlighted">
                        <UIcon name="i-lucide-download-cloud" class="size-5 text-primary" />
                        {{ t('app.offlineDownload.title') }}
                      </div>
                      <p class="mt-2 text-sm leading-6 text-muted">
                        {{ offlineStorageStatus.outdated
                          ? t('app.offlineDownload.statusOutdated', { version: offlineStorageStatus.appVersion, storedVersion: offlineStorageStatus.storedVersion })
                          : t('app.offlineDownload.statusCurrent', { version: offlineStorageStatus.appVersion }) }}
                      </p>
                    </div>
                    <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full" @click="offlineDownloadOpen = false" />
                  </div>

                  <section class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <UCard
                      variant="subtle"
                      :ui="{ root: 'hig-panel overflow-hidden rounded-[1.75rem] border', body: 'p-5' }"
                    >
                      <div class="flex items-start justify-between gap-4">
                        <div>
                          <div class="flex items-center gap-2 text-sm font-semibold text-highlighted">
                            <UIcon name="i-lucide-wifi-off" class="size-4 text-success" />
                            {{ t('app.offlineDownload.availableTools') }}
                          </div>
                          <p class="mt-2 text-sm leading-6 text-muted">
                            {{ t('app.offlineDownload.availableToolsDesc') }}
                          </p>
                        </div>
                        <UBadge color="success" variant="soft" class="shrink-0 rounded-full">
                          {{ t('app.offlineDownload.downloadedCount', { downloaded: downloadedOfflineCount, total: offlineTools.length }) }}
                        </UBadge>
                      </div>
                      <UProgress class="mt-4" :model-value="offlineDownloadProgress" :max="100" color="success" />
                      <UAlert
                        v-if="offlineStorageStatus.outdated"
                        color="warning"
                        variant="soft"
                        icon="i-lucide-refresh-cw"
                        class="mt-4"
                        :description="t('app.offlineDownload.versionOutdatedDesc')"
                      />
                      <div class="mt-4 grid gap-2 sm:grid-cols-2">
                        <div class="tool-metric-card">
                          <div class="text-xs font-semibold text-muted">{{ t('app.offlineDownload.lightTools') }}</div>
                          <div class="mt-1 text-2xl font-black text-highlighted">{{ lightOfflineTools.length }}</div>
                        </div>
                        <div class="tool-metric-card">
                          <div class="text-xs font-semibold text-muted">{{ t('app.offlineDownload.heavyTools') }}</div>
                          <div class="mt-1 text-2xl font-black text-highlighted">{{ heavyOfflineTools.length }}</div>
                        </div>
                      </div>
                      <div class="mt-4 flex flex-wrap gap-2">
                        <UBadge
                          v-for="tool in offlineToolCards.slice(0, 12)"
                          :key="tool.name"
                          :color="isDownloaded(tool.name) ? 'success' : 'neutral'"
                          variant="soft"
                          class="rounded-full"
                        >
                          <UIcon :name="isDownloaded(tool.name) ? 'i-lucide-check' : tool.icon" class="size-3.5" />
                          {{ tool.label }}
                        </UBadge>
                        <UBadge v-if="offlineToolCards.length > 12" color="neutral" variant="soft" class="rounded-full">
                          {{ t('app.offlineDownload.moreTools', { count: offlineToolCards.length - 12 }) }}
                        </UBadge>
                      </div>
                    </UCard>

                    <UCard
                      variant="subtle"
                      :ui="{ root: 'hig-panel overflow-hidden rounded-[1.75rem] border', body: 'p-5' }"
                    >
                      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div class="flex items-center gap-2 text-sm font-semibold text-highlighted">
                            <UIcon name="i-lucide-download-cloud" class="size-4 text-primary" />
                            {{ t('app.offlineDownload.manualTitle') }}
                          </div>
                          <p class="mt-2 text-sm leading-6 text-muted">
                            {{ t('app.offlineDownload.manualDesc') }}
                          </p>
                        </div>
                        <div class="flex shrink-0 flex-wrap gap-2">
                          <UButton color="neutral" variant="soft" size="sm" class="rounded-full" @click="selectSuggestedOfflineTools">{{ t('app.offlineDownload.suggested') }}</UButton>
                          <UButton color="neutral" variant="soft" size="sm" class="rounded-full" @click="selectPendingOfflineTools">{{ t('app.offlineDownload.selectPending') }}</UButton>
                          <UButton color="neutral" variant="soft" size="sm" class="rounded-full" @click="selectAllOfflineTools">{{ t('app.offlineDownload.selectAll') }}</UButton>
                          <UButton color="neutral" variant="ghost" size="sm" class="rounded-full" @click="clearOfflineSelection">{{ t('app.clear') }}</UButton>
                        </div>
                      </div>

                      <div class="mt-4 flex flex-wrap gap-2">
                        <UButton :color="offlineFilter === 'all' ? 'primary' : 'neutral'" :variant="offlineFilter === 'all' ? 'soft' : 'ghost'" size="xs" class="rounded-full" @click="offlineFilter = 'all'">
                          {{ t('app.offlineDownload.filterAll', { count: offlineTools.length }) }}
                        </UButton>
                        <UButton :color="offlineFilter === 'pending' ? 'warning' : 'neutral'" :variant="offlineFilter === 'pending' ? 'soft' : 'ghost'" size="xs" class="rounded-full" @click="offlineFilter = 'pending'">
                          {{ t('app.offlineDownload.filterPending', { count: pendingOfflineTools.length }) }}
                        </UButton>
                        <UButton :color="offlineFilter === 'downloaded' ? 'success' : 'neutral'" :variant="offlineFilter === 'downloaded' ? 'soft' : 'ghost'" size="xs" class="rounded-full" @click="offlineFilter = 'downloaded'">
                          {{ t('app.offlineDownload.filterDownloaded', { count: downloadedOfflineCount }) }}
                        </UButton>
                      </div>

                      <UAlert
                        v-if="failedOfflineToolNames.length"
                        color="warning"
                        variant="soft"
                        icon="i-lucide-triangle-alert"
                        class="mt-4"
                        :description="t('app.offlineDownload.lastFailed', { names: failedOfflineToolLabels })"
                      />

                      <div class="mt-4 max-h-72 space-y-4 overflow-auto pr-1">
                        <div v-for="group in groupedOfflineToolCards" :key="group.domain" class="space-y-2">
                          <div class="flex items-center justify-between px-1">
                            <div class="text-xs font-semibold uppercase tracking-wider text-muted">{{ group.label }}</div>
                            <UBadge color="neutral" variant="soft" size="xs" class="rounded-full">{{ group.items.length }}</UBadge>
                          </div>
                          <div
                            v-for="tool in group.items"
                            :key="tool.name"
                            class="flex w-full items-center gap-3 tool-list-item px-3 py-2"
                          >
                            <UCheckbox :model-value="isOfflineSelected(tool.name)" @update:model-value="toggleOfflineSelection(tool.name)" />
                            <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" @click="toggleOfflineSelection(tool.name)">
                              <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-elevated text-primary">
                                <UIcon :name="tool.icon" class="size-4" />
                              </div>
                              <div class="min-w-0 flex-1">
                                <div class="truncate text-sm font-semibold text-highlighted">{{ tool.label }}</div>
                                <div class="truncate text-xs text-muted">{{ tool.desc }}</div>
                              </div>
                            </button>
                            <UBadge :color="isDownloaded(tool.name) ? 'success' : 'neutral'" variant="soft" size="xs" class="hidden rounded-full sm:inline-flex">
                              {{ isDownloaded(tool.name) ? t('app.offlineDownload.downloaded') : t('app.notDownloaded') }}
                            </UBadge>
                            <UButton
                              color="primary"
                              variant="soft"
                              size="xs"
                              icon="i-lucide-download"
                              class="rounded-full"
                              :loading="downloadingToolName === tool.name"
                              :disabled="downloadingOfflineTools || isDownloaded(tool.name)"
                              @click="downloadOfflineTool(tool.name)"
                            >
                              {{ isDownloaded(tool.name) ? t('app.offlineDownload.downloaded') : t('app.offlineDownload.download') }}
                            </UButton>
                          </div>
                        </div>
                        <div v-if="!filteredOfflineToolCards.length" class="tool-list-item p-4 text-center text-sm text-muted">
                          {{ t('app.offlineDownload.emptyFiltered') }}
                        </div>
                      </div>

                      <div class="mt-4 flex flex-col gap-3 border-t border-default/70 pt-4 md:flex-row md:items-center md:justify-between">
                        <div class="text-xs text-muted">{{ t('app.offlineDownload.selectedSummary', { selected: selectedOfflineTools.length, pending: pendingOfflineTools.length }) }}</div>
                        <div class="flex flex-wrap gap-2">
                          <UButton
                            color="warning"
                            variant="soft"
                            icon="i-lucide-download-cloud"
                            class="rounded-full"
                            :loading="downloadingOfflineTools"
                            :disabled="!pendingOfflineTools.length"
                            @click="downloadPendingOfflineTools"
                          >
                            {{ t('app.offlineDownload.downloadPending') }}
                          </UButton>
                          <UButton
                            color="success"
                            variant="soft"
                            icon="i-lucide-download-cloud"
                            class="rounded-full"
                            :loading="downloadingOfflineTools"
                            @click="downloadAllOfflineTools"
                          >
                            {{ t('app.offlineDownload.downloadAll') }}
                          </UButton>
                          <UButton
                            color="primary"
                            icon="i-lucide-download"
                            class="rounded-full"
                            :loading="downloadingOfflineTools"
                            :disabled="!selectedOfflineTools.length"
                            @click="downloadSelectedOfflineTools"
                          >
                            {{ t('app.offlineDownload.downloadSelected') }}
                          </UButton>
                        </div>
                      </div>
                    </UCard>
                  </section>
                </div>
              </template>
            </UModal>
          </div>
          <div class="space-y-5">
            <h1 class="text-balance text-4xl font-black tracking-tight text-highlighted md:text-5xl lg:text-6xl">
              {{ t('app.heroTitle') }}
            </h1>
            <p class="w-full text-base leading-8 text-muted md:text-lg">
              {{ t('app.heroDesc') }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
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

          <UAlert
            color="primary"
            variant="soft"
            icon="i-lucide-monitor-down"
            orientation="horizontal"
            class="w-full rounded-[1.75rem] border border-primary/20 bg-primary/10"
            :title="t('app.installAppTitle')"
            :description="t('app.installAppDesc')"
          />
      </div>
    </section>

    <section v-if="favoriteCards.length || recentCards.length" class="grid gap-4 lg:grid-cols-2">
      <UCard
        v-if="favoriteCards.length"
        variant="subtle"
        :ui="{ root: 'hig-panel overflow-hidden rounded-[1.75rem] border', body: 'p-5' }"
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
        :ui="{ root: 'hig-panel overflow-hidden rounded-[1.75rem] border', body: 'p-5' }"
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
          <div class="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
            <span class="h-1.5 w-1.5 rounded-full bg-primary" />
            {{ t('app.toolMatrix') }}
          </div>
          <h2 class="text-2xl font-black tracking-tight text-highlighted">{{ t('app.allTools') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ t('app.chooseTool') }}</p>
          <p class="mt-2 text-xs text-muted">{{ t('app.keyboardHint') }}</p>
        </div>
        <UBadge
          color="neutral"
          variant="soft"
          class="w-fit rounded-full px-3 py-1 text-xs font-semibold"
        >
          {{ t('app.toolsCount', { count: toolCards.length }) }}
        </UBadge>
      </div>

      <div class="hig-panel overflow-hidden rounded-[1.75rem] border p-2">
        <UInput
          :id="searchInputId"
          v-model="search"
          type="search"
          icon="i-lucide-search"
          :placeholder="t('app.searchTools')"
          :aria-label="t('app.searchTools')"
          size="xl"
          variant="ghost"
          class="w-full"
          :ui="{ base: 'rounded-2xl text-base', leadingIcon: 'size-5 text-primary' }"
          @keydown.enter="openFirstSearchResult"
          @keydown.esc="clearSearch"
        />
      </div>

      <div v-if="!toolCards.length" class="hig-panel rounded-[1.75rem] border p-8 text-center">
        <div class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-elevated text-primary">
          <UIcon name="i-lucide-search-x" class="size-6" />
        </div>
        <h3 class="mt-4 text-base font-bold text-highlighted">{{ t('app.noToolsFound') }}</h3>
        <p class="mt-2 text-sm text-muted">{{ t('app.noToolsFoundDesc') }}</p>
        <UButton color="neutral" variant="soft" class="mt-4 rounded-full" @click="clearSearch">
          {{ t('app.clear') }}
        </UButton>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <UCard
          v-for="tool in toolCards"
          :key="tool.path"
          variant="subtle"
          class="group"
          role="link"
          tabindex="0"
          :aria-label="t('app.openTool', { name: tool.label })"
          :ui="{ root: 'home-tool-card hig-panel group cursor-pointer overflow-hidden rounded-[1.75rem] border outline-none transition-all duration-300 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10 focus-visible:hig-focus', body: 'p-5' }"
          @pointerenter="handleIntentPreload(tool.name)"
          @focusin="handleIntentPreload(tool.name)"
          @keydown="handleToolCardKeydown($event, tool.path)"
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
              <UBadge
                v-if="tool.status && tool.status !== 'stable'"
                :color="tool.status === 'experimental' ? 'warning' : tool.status === 'beta' ? 'info' : 'neutral'"
                variant="soft"
                size="xs"
                class="rounded-full uppercase"
              >
                {{ tool.status }}
              </UBadge>
              <UBadge v-if="tool.capabilities?.includes('offline')" :color="isDownloaded(tool.name) ? 'success' : 'neutral'" variant="soft" size="xs" class="rounded-full">
                {{ isDownloaded(tool.name) ? t('app.offlineReady') : t('app.notDownloaded') }}
              </UBadge>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                class="rounded-full"
                :aria-label="isFavorite(tool.name) ? t('app.removeFavorite') : t('app.addFavorite')"
                :title="isFavorite(tool.name) ? t('app.removeFavorite') : t('app.addFavorite')"
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
