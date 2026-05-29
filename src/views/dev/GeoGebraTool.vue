<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import HostedAppFrame from '@/components/tool/HostedAppFrame.vue'
import ToolPage from '@/components/tool/ToolPage.vue'

const { t } = useI18n()

const badges = computed(() => [
  t('tools.geogebra.badges.packaged'),
  t('tools.geogebra.badges.sameOrigin'),
  t('tools.geogebra.badges.mathLab'),
])

const features = computed(() => [
  {
    icon: 'i-lucide-shapes',
    title: t('tools.geogebra.features.geometryTitle'),
    description: t('tools.geogebra.features.geometryDesc'),
  },
  {
    icon: 'i-lucide-chart-no-axes-combined',
    title: t('tools.geogebra.features.graphingTitle'),
    description: t('tools.geogebra.features.graphingDesc'),
  },
  {
    icon: 'i-lucide-square-function',
    title: t('tools.geogebra.features.algebraTitle'),
    description: t('tools.geogebra.features.algebraDesc'),
  },
  {
    icon: 'i-lucide-cuboid',
    title: t('tools.geogebra.features.classicTitle'),
    description: t('tools.geogebra.features.classicDesc'),
  },
])
</script>

<template>
  <ToolPage name="geogebra" max-width="full" icon="i-lucide-shapes">
    <HostedAppFrame
      src="/apps/geogebra/index.html"
      icon="i-lucide-shapes"
      accent="secondary"
      :title="$t('tools.geogebra.launchTitle')"
      :description="$t('tools.geogebra.launchDesc')"
      :launch-label="$t('tools.geogebra.launch')"
      :loading-label="$t('tools.geogebra.loading')"
      :retry-label="$t('tools.geogebra.retry')"
      :fullscreen-label="$t('tools.geogebra.fullscreen')"
      :exit-fullscreen-label="$t('tools.geogebra.exitFullscreen')"
      :failed-title="$t('tools.geogebra.failedTitle')"
      :failed-description="$t('tools.geogebra.failedDesc')"
      :notice-title="$t('tools.geogebra.noticeTitle')"
      :notice-description="$t('tools.geogebra.noticeDesc')"
      :offline-hint="$t('tools.geogebra.offlineHint')"
      :size-hint="$t('tools.geogebra.sizeHint')"
      :badges="badges"
      :features="features"
    />
  </ToolPage>
</template>
