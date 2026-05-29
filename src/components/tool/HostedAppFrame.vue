<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type HostedAppFeature = {
  icon?: string
  title: string
  description: string
}

const props = withDefaults(
  defineProps<{
    src: string
    title: string
    description: string
    launchLabel: string
    loadingLabel: string
    retryLabel: string
    fullscreenLabel: string
    exitFullscreenLabel: string
    failedTitle: string
    failedDescription: string
    noticeTitle: string
    noticeDescription: string
    offlineHint: string
    sizeHint: string
    icon?: string
    accent?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
    badges?: string[]
    features?: HostedAppFeature[]
  }>(),
  {
    icon: 'i-lucide-box',
    accent: 'primary',
    badges: () => [],
    features: () => [],
  },
)

const started = ref(false)
const loading = ref(false)
const failed = ref(false)
const fullscreen = ref(false)

const safeSrc = computed(() => {
  if (!props.src.startsWith('/apps/')) return ''
  return props.src
})

const frameSrc = computed(() => (started.value ? safeSrc.value : ''))
const canLaunch = computed(() => Boolean(safeSrc.value))
const stageClass = computed(() => [
  'hosted-app-stage',
  fullscreen.value
    ? 'tool-fullscreen-stage fixed inset-0 z-50 flex flex-col p-2 sm:p-4'
    : 'tool-stage overflow-hidden p-3 sm:p-4',
])

function launch() {
  if (!canLaunch.value) return
  failed.value = false
  loading.value = true
  started.value = true
}

function retry() {
  if (!canLaunch.value) return
  failed.value = false
  loading.value = true
  started.value = false
  requestAnimationFrame(() => {
    started.value = true
  })
}

function handleLoad() {
  loading.value = false
  failed.value = false
}

function handleError() {
  loading.value = false
  failed.value = true
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && fullscreen.value) fullscreen.value = false
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="hosted-app-shell">
    <div v-if="!started" class="hosted-app-launch hig-panel overflow-hidden rounded-[2rem] border p-5 sm:p-7">
      <div class="hosted-app-orbit" aria-hidden="true" />
      <div class="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,0.94fr)_minmax(18rem,0.56fr)] lg:items-end">
        <div class="min-w-0">
          <div class="mb-4 flex flex-wrap gap-2">
            <UBadge v-for="badge in badges" :key="badge" :color="accent" variant="soft" class="rounded-full">
              {{ badge }}
            </UBadge>
          </div>
          <div class="flex items-start gap-4">
            <div class="hosted-app-icon grid shrink-0 place-items-center rounded-[1.35rem] text-white shadow-lg">
              <UIcon :name="icon" class="size-7" />
            </div>
            <div class="min-w-0">
              <h2 class="text-2xl font-black tracking-tight text-highlighted sm:text-3xl">{{ title }}</h2>
              <p class="mt-3 max-w-3xl text-sm leading-6 text-muted sm:text-base">{{ description }}</p>
            </div>
          </div>

          <div v-if="features.length" class="mt-7 grid gap-3 sm:grid-cols-2">
            <div v-for="feature in features" :key="feature.title" class="hosted-app-feature">
              <UIcon v-if="feature.icon" :name="feature.icon" class="mt-0.5 size-4 shrink-0 text-primary" />
              <div class="min-w-0">
                <div class="text-sm font-bold text-highlighted">{{ feature.title }}</div>
                <p class="mt-1 text-xs leading-5 text-muted">{{ feature.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="hosted-app-dock rounded-[1.5rem] border p-4">
          <UAlert :title="noticeTitle" :description="noticeDescription" color="warning" variant="soft" icon="i-lucide-hard-drive-download" />
          <div class="mt-4 grid gap-2 text-xs leading-5 text-muted">
            <div class="flex gap-2">
              <UIcon name="i-lucide-wifi-off" class="mt-0.5 size-4 shrink-0" />
              <span>{{ offlineHint }}</span>
            </div>
            <div class="flex gap-2">
              <UIcon name="i-lucide-package-open" class="mt-0.5 size-4 shrink-0" />
              <span>{{ sizeHint }}</span>
            </div>
          </div>
          <UButton class="mt-5 w-full justify-center rounded-full" size="lg" :color="accent" :disabled="!canLaunch" icon="i-lucide-rocket" @click="launch">
            {{ launchLabel }}
          </UButton>
        </div>
      </div>
    </div>

    <div v-else :class="stageClass">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="tool-command-bar min-w-0">
          <UBadge :color="loading ? 'warning' : failed ? 'error' : 'success'" variant="soft" class="rounded-full">
            {{ loading ? loadingLabel : failed ? failedTitle : title }}
          </UBadge>
          <span class="truncate text-xs text-muted">{{ safeSrc }}</span>
        </div>
        <div class="tool-command-bar shrink-0">
          <UButton color="neutral" variant="ghost" class="rounded-full" icon="i-lucide-refresh-cw" @click="retry">
            {{ retryLabel }}
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            class="rounded-full"
            :icon="fullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
            @click="fullscreen = !fullscreen"
          >
            {{ fullscreen ? exitFullscreenLabel : fullscreenLabel }}
          </UButton>
        </div>
      </div>

      <div class="hosted-app-frame-wrap relative min-h-[34rem] flex-1 overflow-hidden rounded-[1.35rem] border bg-default shadow-inner shadow-default/5">
        <div v-if="loading" class="absolute inset-0 z-10 grid place-items-center bg-default/70 backdrop-blur-sm">
          <div class="text-center">
            <UIcon name="i-lucide-loader-circle" class="mx-auto size-8 animate-spin text-primary" />
            <p class="mt-3 text-sm font-semibold text-highlighted">{{ loadingLabel }}</p>
          </div>
        </div>

        <UAlert v-if="failed" class="absolute left-4 right-4 top-4 z-20" color="error" variant="soft" icon="i-lucide-circle-alert" :title="failedTitle" :description="failedDescription" />

        <iframe
          v-if="frameSrc"
          class="h-full min-h-[34rem] w-full border-0 bg-white"
          :src="frameSrc"
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox allow-modals"
          referrerpolicy="same-origin"
          allow="fullscreen; clipboard-read; clipboard-write"
          @load="handleLoad"
          @error="handleError"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.hosted-app-shell {
  position: relative;
}

.hosted-app-launch {
  position: relative;
  background:
    radial-gradient(circle at 8% 8%, color-mix(in oklab, var(--ui-primary) 17%, transparent), transparent 19rem),
    radial-gradient(circle at 92% 16%, color-mix(in oklab, var(--ui-secondary) 14%, transparent), transparent 20rem),
    linear-gradient(145deg, color-mix(in oklab, var(--ui-bg-elevated) 95%, transparent), color-mix(in oklab, var(--ui-bg) 76%, transparent));
}

.hosted-app-orbit {
  position: absolute;
  inset: auto -7rem -13rem auto;
  width: 28rem;
  height: 28rem;
  border: 1px solid color-mix(in oklab, var(--ui-primary) 26%, transparent);
  border-radius: 999px;
  opacity: 0.55;
}

.hosted-app-orbit::before,
.hosted-app-orbit::after {
  content: '';
  position: absolute;
  inset: 3.4rem;
  border: 1px solid color-mix(in oklab, var(--ui-secondary) 24%, transparent);
  border-radius: inherit;
}

.hosted-app-orbit::after {
  inset: 7.8rem;
  background: radial-gradient(circle, color-mix(in oklab, var(--ui-primary) 12%, transparent), transparent 62%);
}

.hosted-app-icon {
  width: 3.5rem;
  height: 3.5rem;
  background:
    radial-gradient(circle at 30% 20%, color-mix(in oklab, white 34%, transparent), transparent 42%),
    linear-gradient(135deg, var(--ui-primary), var(--ui-secondary));
}

.hosted-app-feature,
.hosted-app-dock {
  background: color-mix(in oklab, var(--ui-bg-elevated) 62%, transparent);
  border-color: color-mix(in oklab, var(--ui-border) 68%, transparent);
  box-shadow: 0 1px 0 color-mix(in oklab, white 20%, transparent) inset;
}

.hosted-app-feature {
  display: flex;
  gap: 0.65rem;
  border-radius: 1.15rem;
  border-width: 1px;
  padding: 0.85rem;
}

.hosted-app-stage {
  transition: border-radius 180ms ease, padding 180ms ease;
}

.hosted-app-frame-wrap {
  height: min(78vh, 58rem);
}

.fixed .hosted-app-frame-wrap {
  height: auto;
}
</style>
