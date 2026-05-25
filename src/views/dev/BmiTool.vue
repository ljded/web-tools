<script setup lang="ts">
import { computed } from 'vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

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
</script>

<template>
  <ToolPage name="bmi" max-width="4xl" icon="i-lucide-heart-pulse">
    <ToolSection :title="$t('tools.bmi.inputTitle')" :description="$t('tools.bmi.inputDesc')">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UFormField :label="$t('tools.bmi.heightCm')">
          <UInput v-model.number="heightCm" type="number" :min="50" :max="250" />
        </UFormField>
        <UFormField :label="$t('tools.bmi.weightKg')">
          <UInput v-model.number="weightKg" type="number" :min="10" :max="300" />
        </UFormField>
      </div>
    </ToolSection>

    <ResultPanel :title="$t('tools.bmi.resultTitle')" :value="String(bmi)" compact />
    <ResultPanel v-if="category" :title="$t('tools.bmi.levelTitle')" :value="$t(`tools.bmi.levels.${category}`)" :monospace="false" compact />
  </ToolPage>
</template>
