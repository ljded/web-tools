<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyBtn from '@/components/CopyBtn.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'

type Category = 'length' | 'weight' | 'temperature'
type UnitValue = 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft' | 'mg' | 'g' | 'kg' | 'lb' | 'c' | 'f' | 'k'

const category = ref<Category>('length')
const inputValue = ref('1')
const fromUnit = ref<UnitValue>('m')
const toUnit = ref<UnitValue>('cm')

const unitMap = {
  length: [
    { label: 'mm', value: 'mm', factor: 0.001 },
    { label: 'cm', value: 'cm', factor: 0.01 },
    { label: 'm', value: 'm', factor: 1 },
    { label: 'km', value: 'km', factor: 1000 },
    { label: 'in', value: 'in', factor: 0.0254 },
    { label: 'ft', value: 'ft', factor: 0.3048 },
  ],
  weight: [
    { label: 'mg', value: 'mg', factor: 0.000001 },
    { label: 'g', value: 'g', factor: 0.001 },
    { label: 'kg', value: 'kg', factor: 1 },
    { label: 'lb', value: 'lb', factor: 0.45359237 },
  ],
  temperature: [
    { label: '°C', value: 'c' },
    { label: '°F', value: 'f' },
    { label: 'K', value: 'k' },
  ],
} as const

const currentUnits = computed(() => unitMap[category.value])

function normalizeUnits() {
  const units = currentUnits.value
  if (!units.find((item) => item.value === fromUnit.value)) fromUnit.value = units[0]!.value
  if (!units.find((item) => item.value === toUnit.value)) toUnit.value = units[1]?.value ?? units[0]!.value
}

const result = computed(() => {
  normalizeUnits()
  const value = Number(inputValue.value)
  if (Number.isNaN(value)) return ''

  if (category.value === 'temperature') {
    let celsius = value
    if (fromUnit.value === 'f') celsius = ((value - 32) * 5) / 9
    if (fromUnit.value === 'k') celsius = value - 273.15

    let output = celsius
    if (toUnit.value === 'f') output = (celsius * 9) / 5 + 32
    if (toUnit.value === 'k') output = celsius + 273.15
    return String(Number(output.toFixed(10)))
  }

  const from = currentUnits.value.find((item) => item.value === fromUnit.value)
  const to = currentUnits.value.find((item) => item.value === toUnit.value)
  if (!from || !to || !('factor' in from) || !('factor' in to)) return ''

  const baseValue = value * from.factor
  const output = baseValue / to.factor
  return String(Number(output.toFixed(12)))
})

function swapUnits() {
  const next = fromUnit.value
  fromUnit.value = toUnit.value
  toUnit.value = next
}
</script>

<template>
  <ToolPage name="unit" max-width="4xl" icon="i-lucide-ruler">
    <ToolSection :title="$t('tools.unit.inputTitle')" :description="$t('tools.unit.inputDesc')">
      <UFormField :label="$t('tools.unit.category')">
        <USelect
          v-model="category"
          :items="[
            { label: $t('tools.unit.categories.length'), value: 'length' },
            { label: $t('tools.unit.categories.weight'), value: 'weight' },
            { label: $t('tools.unit.categories.temperature'), value: 'temperature' },
          ]"
        />
      </UFormField>

      <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr]">
        <UFormField :label="$t('tools.unit.from')">
          <USelect v-model="fromUnit" :items="currentUnits.map((item) => ({ label: item.label, value: item.value }))" />
        </UFormField>
        <div class="flex items-end justify-center">
          <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left-right" class="rounded-full" @click="swapUnits" />
        </div>
        <UFormField :label="$t('tools.unit.to')">
          <USelect v-model="toUnit" :items="currentUnits.map((item) => ({ label: item.label, value: item.value }))" />
        </UFormField>
      </div>

      <div class="mt-4">
        <UFormField :label="$t('tools.unit.value')">
          <UInput v-model="inputValue" type="number" />
        </UFormField>
      </div>
    </ToolSection>

    <ResultPanel :title="$t('tools.unit.resultTitle')" :value="result">
      <template #actions>
        <CopyBtn :text="result" variant="button" :disabled="!result" />
      </template>
    </ResultPanel>
  </ToolPage>
</template>
