<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import HostedAppFrame from '@/components/tool/HostedAppFrame.vue'
import ToolPage from '@/components/tool/ToolPage.vue'

const { t, locale } = useI18n()

const diagramsSrc = computed(() => {
  const lang = locale.value === 'zh-CN' ? 'zh' : 'en'
  return `/apps/diagrams/index.html?mode=device&enableSW=1&lang=${lang}`
})

const badges = computed(() => [
  t('tools.diagrams.badges.packaged'),
  t('tools.diagrams.badges.sameOrigin'),
  t('tools.diagrams.badges.localFiles'),
])

const features = computed(() => [
  {
    icon: 'i-lucide-git-fork',
    title: t('tools.diagrams.features.flowchartTitle'),
    description: t('tools.diagrams.features.flowchartDesc'),
  },
  {
    icon: 'i-lucide-network',
    title: t('tools.diagrams.features.architectureTitle'),
    description: t('tools.diagrams.features.architectureDesc'),
  },
  {
    icon: 'i-lucide-boxes',
    title: t('tools.diagrams.features.umlTitle'),
    description: t('tools.diagrams.features.umlDesc'),
  },
  {
    icon: 'i-lucide-save',
    title: t('tools.diagrams.features.localTitle'),
    description: t('tools.diagrams.features.localDesc'),
  },
])
</script>

<template>
  <ToolPage name="diagrams" max-width="full" icon="i-lucide-workflow">
    <HostedAppFrame
      :src="diagramsSrc"
      icon="i-lucide-workflow"
      accent="info"
      :title="$t('tools.diagrams.launchTitle')"
      :description="$t('tools.diagrams.launchDesc')"
      :launch-label="$t('tools.diagrams.launch')"
      :loading-label="$t('tools.diagrams.loading')"
      :retry-label="$t('tools.diagrams.retry')"
      :fullscreen-label="$t('tools.diagrams.fullscreen')"
      :exit-fullscreen-label="$t('tools.diagrams.exitFullscreen')"
      :failed-title="$t('tools.diagrams.failedTitle')"
      :failed-description="$t('tools.diagrams.failedDesc')"
      :notice-title="$t('tools.diagrams.noticeTitle')"
      :notice-description="$t('tools.diagrams.noticeDesc')"
      :offline-hint="$t('tools.diagrams.offlineHint')"
      :size-hint="$t('tools.diagrams.sizeHint')"
      :badges="badges"
      :features="features"
    />
  </ToolPage>
</template>
