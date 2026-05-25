<script setup lang="ts">
import { computed } from 'vue'
import CopyBtn from '@/components/CopyBtn.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const input = usePersistedRef('web-tools:base:input', '255')
const fromBase = usePersistedRef('web-tools:base:from', 10)
const toBase = usePersistedRef('web-tools:base:to', 16)

const baseItems = Array.from({ length: 35 }, (_, i) => {
  const value = i + 2
  return { label: String(value), value }
})

const result = computed(() => {
  const raw = input.value.trim()
  if (!raw) return ''
  const from = Number(fromBase.value)
  const to = Number(toBase.value)
  if (from < 2 || from > 36 || to < 2 || to > 36) return ''
  try {
    const parsed = parseInt(raw, from)
    if (Number.isNaN(parsed)) return 'Invalid number'
    return parsed.toString(to).toUpperCase()
  } catch {
    return 'Invalid number'
  }
})

function swapBases() {
  const next = fromBase.value
  fromBase.value = toBase.value
  toBase.value = next
}
</script>

<template>
  <ToolPage name="base" max-width="4xl" icon="i-lucide-binary">
    <ToolSection :title="$t('tools.base.inputTitle')" :description="$t('tools.base.inputDesc')">
      <UFormField :label="$t('tools.base.inputNumber')">
        <UInput v-model="input" :placeholder="$t('tools.base.placeholder')" />
      </UFormField>

      <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr]">
        <UFormField :label="$t('tools.base.fromBase')">
          <USelect v-model="fromBase" :items="baseItems" />
        </UFormField>
        <div class="flex items-end justify-center">
          <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left-right" class="rounded-full" @click="swapBases" />
        </div>
        <UFormField :label="$t('tools.base.toBase')">
          <USelect v-model="toBase" :items="baseItems" />
        </UFormField>
      </div>
    </ToolSection>

    <ResultPanel :title="$t('tools.base.resultTitle')" :value="result">
      <template #actions>
        <CopyBtn :text="result" variant="button" :disabled="!result" />
      </template>
    </ResultPanel>
  </ToolPage>
</template>
