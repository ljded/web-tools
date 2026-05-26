<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const { t } = useI18n()
const heightCm = usePersistedRef('web-tools:bmi:height-cm', 170)
const weightKg = usePersistedRef('web-tools:bmi:weight-kg', 65)

const bmi = computed(() => {
  const h = Number(heightCm.value) / 100
  const w = Number(weightKg.value)
  if (h <= 0 || w <= 0) return 0
  return Number((w / (h * h)).toFixed(1))
})

const category = computed(() => {
  if (bmi.value <= 0) return ''
  if (bmi.value < 18.5) return 'underweight'
  if (bmi.value < 24) return 'normal'
  if (bmi.value < 28) return 'overweight'
  return 'obese'
})

const resultMeta = computed(() => [
  { label: t('tools.bmi.height'), value: `${heightCm.value} cm` },
  { label: t('tools.bmi.weight'), value: `${weightKg.value} kg` },
])
</script>

<template>
  <ToolPage name="bmi" max-width="6xl" icon="i-lucide-heart-pulse">
    <div class="tool-workspace">
      <ToolSection :title="$t('tools.bmi.inputTitle')" :description="$t('tools.bmi.inputDesc')">
        <div class="space-y-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField :label="$t('tools.bmi.heightCm')">
              <UInput v-model.number="heightCm" type="number" :min="50" :max="250" class="w-full" size="lg" />
            </UFormField>
            <UFormField :label="$t('tools.bmi.weightKg')">
              <UInput v-model.number="weightKg" type="number" :min="10" :max="300" class="w-full" size="lg" />
            </UFormField>
          </div>

          <ResultPanel
            class="lg:hidden"
            :title="$t('tools.bmi.resultTitle')"
            :value="String(bmi)"
            :meta="resultMeta"
            compact
          >
            <div class="space-y-1">
              <div class="text-3xl font-black text-highlighted">{{ bmi || '-' }}</div>
              <div v-if="category" class="text-sm text-muted">{{ $t(`tools.bmi.levels.${category}`) }}</div>
            </div>
          </ResultPanel>
        </div>
      </ToolSection>

      <div class="hidden lg:block tool-preview-sticky">
        <ResultPanel :title="$t('tools.bmi.resultTitle')" :value="String(bmi)" :meta="resultMeta">
          <div class="space-y-2">
            <div class="text-5xl font-black text-highlighted">{{ bmi || '-' }}</div>
            <div v-if="category" class="text-base font-medium text-muted">{{ $t(`tools.bmi.levels.${category}`) }}</div>
          </div>
        </ResultPanel>
      </div>
    </div>
  </ToolPage>
</template>
