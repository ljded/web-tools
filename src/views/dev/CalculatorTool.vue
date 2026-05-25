<script setup lang="ts">
import { computed } from 'vue'
import CopyBtn from '@/components/CopyBtn.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const expression = usePersistedRef('web-tools:calculator:expression', '1 + 2 * 3')

const result = computed(() => {
  const exp = expression.value.trim()
  if (!exp) return ''
  if (!/^[0-9+\-*/%().\s]+$/.test(exp)) return 'Invalid expression'
  try {
    const value = Function(`"use strict"; return (${exp})`)()
    return Number.isFinite(value) ? String(value) : 'NaN'
  } catch {
    return 'Invalid expression'
  }
})

function append(token: string) {
  expression.value += token
}

function clearAll() {
  expression.value = ''
}

function backspace() {
  expression.value = expression.value.slice(0, -1)
}

const keys = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', '(', ')'],
  ['%', '+'],
]
</script>

<template>
  <ToolPage name="calculator" max-width="4xl" icon="i-lucide-calculator">
    <ToolSection :title="$t('tools.calculator.inputTitle')" :description="$t('tools.calculator.inputDesc')">
      <UInput v-model="expression" :placeholder="$t('tools.calculator.placeholder')" class="w-full" />
      <div class="mt-4 space-y-2">
        <div v-for="(row, rowIndex) in keys" :key="rowIndex" class="grid grid-cols-4 gap-2">
          <UButton
            v-for="key in row"
            :key="key"
            color="neutral"
            variant="soft"
            class="rounded-xl"
            @click="append(key)"
          >
            {{ key }}
          </UButton>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <UButton color="neutral" variant="ghost" class="rounded-xl" icon="i-lucide-delete" @click="backspace">
            {{ $t('tools.calculator.backspace') }}
          </UButton>
          <UButton color="error" variant="ghost" class="rounded-xl" icon="i-lucide-eraser" @click="clearAll">
            {{ $t('tools.calculator.clear') }}
          </UButton>
        </div>
      </div>
    </ToolSection>

    <ResultPanel :title="$t('tools.calculator.resultTitle')" :value="result" :monospace="true">
      <template #actions>
        <CopyBtn :text="result" variant="button" :disabled="!result" />
      </template>
    </ResultPanel>
  </ToolPage>
</template>
