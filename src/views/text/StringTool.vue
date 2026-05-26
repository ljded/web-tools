<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToolState } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'

const { input, history, saveHistory } = useToolState<string, { input: string }>({
  storageKey: 'string-tool',
  defaultInput: 'hello_world-example Text',
  getHistoryData: (value) => ({ input: value }),
  historyOptions: {
    maxCount: 15,
    generateLabel: (d) => d.input.slice(0, 40) + (d.input.length > 40 ? '...' : ''),
  },
})

const selectedResultKey = ref('camel')

function onHistorySelect(item: { data: { input: string } }) {
  input.value = item.data.input
}

function splitWords(text: string): string[] {
  const normalized = text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-\s]+/g, ' ')
    .trim()
  return normalized ? normalized.split(/\s+/) : []
}

function capitalize(word: string): string {
  if (!word) return ''
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function toCamelCase(text: string): string {
  const words = splitWords(text)
  if (!words.length) return ''
  return words[0]!.toLowerCase() + words.slice(1).map(capitalize).join('')
}

function toPascalCase(text: string): string {
  return splitWords(text).map(capitalize).join('')
}

function toSnakeCase(text: string): string {
  return splitWords(text).map((w) => w.toLowerCase()).join('_')
}

function toKebabCase(text: string): string {
  return splitWords(text).map((w) => w.toLowerCase()).join('-')
}

function toTitleCase(text: string): string {
  return splitWords(text).map(capitalize).join(' ')
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function uniqueLines(text: string): string {
  const lines = text.split(/\r?\n/)
  return Array.from(new Set(lines)).join('\n')
}

function sortLines(text: string): string {
  return text
    .split(/\r?\n/)
    .slice()
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN-u-co-pinyin'))
    .join('\n')
}

function reverseLines(text: string): string {
  return text.split(/\r?\n/).reverse().join('\n')
}

const results = computed(() => {
  const source = input.value
  if (!source) return [] as Array<{ key: string; value: string }>

  return [
    { key: 'upper', value: source.toUpperCase() },
    { key: 'lower', value: source.toLowerCase() },
    { key: 'title', value: toTitleCase(source) },
    { key: 'camel', value: toCamelCase(source) },
    { key: 'pascal', value: toPascalCase(source) },
    { key: 'snake', value: toSnakeCase(source) },
    { key: 'kebab', value: toKebabCase(source) },
    { key: 'trimmed', value: source.trim() },
    { key: 'collapsed', value: collapseWhitespace(source) },
    { key: 'uniqueLines', value: uniqueLines(source) },
    { key: 'sortedLines', value: sortLines(source) },
    { key: 'reversedLines', value: reverseLines(source) },
  ]
})

const selectedResult = computed(() => results.value.find((item) => item.key === selectedResultKey.value) ?? results.value[0])
</script>

<template>
  <ToolPage name="string" max-width="6xl">
    <div class="tool-workspace">
      <ToolSection :title="$t('tools.string.inputTitle')" :description="$t('tools.string.inputDesc')">
        <template #actions>
          <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
        </template>
        <div class="space-y-4">
          <UTextarea
            v-model="input"
            @blur="saveHistory"
            :placeholder="$t('tools.string.inputPlaceholder')"
            :rows="10"
            class="w-full"
          />
          <ResultPanel
            v-if="selectedResult"
            class="lg:hidden"
            :title="$t(`tools.string.results.${selectedResult.key}`)"
            :value="selectedResult.value"
            pre-wrap
            compact
          />
        </div>
      </ToolSection>

      <div class="space-y-4 tool-preview-sticky">
        <ResultPanel
          :title="selectedResult ? $t(`tools.string.results.${selectedResult.key}`) : $t('app.result')"
          :value="selectedResult?.value || ''"
          pre-wrap
          max-height="360px"
        />
        <UCard
          v-if="results.length"
          variant="subtle"
          :ui="{ root: 'hig-panel rounded-[1.75rem] border', body: 'p-3' }"
        >
          <div class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{{ $t('tools.string.quickResults') }}</div>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <UButton
              v-for="item in results"
              :key="item.key"
              :color="selectedResultKey === item.key ? 'primary' : 'neutral'"
              :variant="selectedResultKey === item.key ? 'soft' : 'ghost'"
              size="xs"
              class="justify-start rounded-xl"
              @click="selectedResultKey = item.key"
            >
              {{ $t(`tools.string.results.${item.key}`) }}
            </UButton>
          </div>
        </UCard>
      </div>
    </div>
  </ToolPage>
</template>
