<script setup lang="ts">
import { computed, ref } from 'vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

type Mode = 'stats' | 'dedupe' | 'sort' | 'chunk'

const mode = usePersistedRef<Mode>('web-tools:bigtext:mode', 'stats')
const input = usePersistedRef('web-tools:bigtext:input', 'line-1\nline-2\nline-1\nline-3')
const chunkSize = usePersistedRef('web-tools:bigtext:chunk-size', 1000)
const chunkIndex = ref(0)

const lines = computed(() => input.value.split(/\r?\n/))

const statsText = computed(() => {
  const text = input.value
  const lineCount = lines.value.length
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const charCount = text.length
  const byteCount = new TextEncoder().encode(text).length

  return [
    `lines: ${lineCount}`,
    `words: ${wordCount}`,
    `chars: ${charCount}`,
    `bytes: ${byteCount}`,
  ].join('\n')
})

const deduped = computed(() => Array.from(new Set(lines.value)).join('\n'))

const sorted = computed(() => [...lines.value].sort((a, b) => a.localeCompare(b)).join('\n'))

const chunks = computed(() => {
  const size = Math.max(1, Number(chunkSize.value) || 1)
  const text = input.value
  const list: string[] = []
  for (let i = 0; i < text.length; i += size) {
    list.push(text.slice(i, i + size))
  }
  return list
})

const output = computed(() => {
  if (mode.value === 'stats') return statsText.value
  if (mode.value === 'dedupe') return deduped.value
  if (mode.value === 'sort') return sorted.value
  if (!chunks.value.length) return ''
  const safeIndex = Math.max(0, Math.min(chunkIndex.value, chunks.value.length - 1))
  chunkIndex.value = safeIndex
  return chunks.value[safeIndex]!
})

const chunkMeta = computed(() => `${chunkIndex.value + 1}/${Math.max(chunks.value.length, 1)}`)

function resetChunkIndex() {
  chunkIndex.value = 0
}
</script>

<template>
  <ToolPage name="bigtext" max-width="6xl" icon="i-lucide-database">
    <div class="tool-workspace">
      <ToolSection :title="$t('tools.bigtext.inputTitle')" :description="$t('tools.bigtext.inputDesc')">
        <div class="space-y-5">
          <UTabs
            v-model="mode"
            :items="[
              { label: $t('tools.bigtext.modes.stats'), value: 'stats' },
              { label: $t('tools.bigtext.modes.dedupe'), value: 'dedupe' },
              { label: $t('tools.bigtext.modes.sort'), value: 'sort' },
              { label: $t('tools.bigtext.modes.chunk'), value: 'chunk' },
            ]"
            @update:model-value="resetChunkIndex"
          />

          <UTextarea v-model="input" :rows="14" class="w-full" :placeholder="$t('tools.bigtext.placeholder')" />

          <div v-if="mode === 'chunk'" class="tool-control-grid">
            <UFormField :label="$t('tools.bigtext.chunkSize')">
              <UInput v-model.number="chunkSize" type="number" :min="1" :max="500000" class="w-full" />
            </UFormField>
            <UFormField :label="$t('tools.bigtext.chunkIndex')">
              <UInput
                :model-value="chunkIndex + 1"
                type="number"
                :min="1"
                :max="Math.max(chunks.length, 1)"
                class="w-full"
                @update:model-value="chunkIndex = Math.max(0, Math.min(Number($event || 1) - 1, Math.max(chunks.length - 1, 0)))"
              />
            </UFormField>
            <div class="tool-metric-card flex items-center text-sm text-muted">{{ $t('tools.bigtext.chunkMeta', { meta: chunkMeta }) }}</div>
          </div>
        </div>
      </ToolSection>

      <div class="tool-preview-sticky space-y-4">
        <ToolSection :title="$t('tools.bigtext.overviewTitle')" compact>
          <div class="grid grid-cols-2 gap-3">
            <div class="tool-metric-card"><div class="text-2xl font-black text-highlighted">{{ lines.length }}</div><div class="text-xs text-muted">{{ $t('tools.bigtext.lines') }}</div></div>
            <div class="tool-metric-card"><div class="text-2xl font-black text-highlighted">{{ input.length }}</div><div class="text-xs text-muted">{{ $t('tools.bigtext.chars') }}</div></div>
          </div>
        </ToolSection>
        <ResultPanel :title="$t('tools.bigtext.resultTitle')" :value="output" pre-wrap max-height="520px" />
      </div>
    </div>
  </ToolPage>
</template>
