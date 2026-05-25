<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyBtn from '@/components/CopyBtn.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const sourceText = usePersistedRef('web-tools:picker:source', 'Apple\nBanana\nOrange\nGrape\nMango')
const rangeText = usePersistedRef('web-tools:picker:range', '')
const excludeText = usePersistedRef('web-tools:picker:exclude', '')
const rewardText = usePersistedRef('web-tools:picker:rewards', '一等奖*1\n二等奖*2\n三等奖*3')
const pickCount = usePersistedRef('web-tools:picker:count', 1)
const uniqueOnly = usePersistedRef('web-tools:picker:unique', true)
const result = ref<string[]>([])

type Reward = { name: string; count: number }

function expandRange(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return []
  const match = trimmed.match(/^(-?\d+)\s*(?:-|~|到|\.\.)\s*(-?\d+)$/)
  if (!match) return []
  const start = Number(match[1])
  const end = Number(match[2])
  const step = start <= end ? 1 : -1
  const values: string[] = []
  for (let current = start; step > 0 ? current <= end : current >= end; current += step) {
    values.push(String(current))
    if (values.length >= 10000) break
  }
  return values
}

function parseOrderedLine(line: string) {
  return line
    .replace(/^\s*(?:\d+|[A-Za-z]|[一二三四五六七八九十]+)[\.、\)）]\s*/, '')
    .trim()
}

function normalizeLines(text: string) {
  return text
    .split(/\r?\n|[,，]/)
    .map(parseOrderedLine)
    .filter(Boolean)
}

const excluded = computed(() => new Set(normalizeLines(excludeText.value)))

const candidates = computed(() => {
  const source = [...expandRange(rangeText.value), ...normalizeLines(sourceText.value)]
  return source.filter((item, index, arr) => !excluded.value.has(item) && arr.indexOf(item) === index)
})

const rewards = computed<Reward[]>(() =>
  rewardText.value
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      const match = trimmed.match(/^(.+?)(?:\s*[xX*×:]\s*|\s+)(\d+)$/)
      return match ? { name: match[1]!.trim(), count: Math.max(1, Math.min(Number(match[2]), 200)) } : null
    })
    .filter((item): item is Reward => Boolean(item?.name)),
)

const resultText = computed(() => result.value.join('\n'))

function shuffle<T>(list: T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr
}

function pickFromList(list: string[], count: number) {
  if (uniqueOnly.value) return shuffle(list).slice(0, Math.min(count, list.length))
  const picked: string[] = []
  for (let i = 0; i < count; i++) picked.push(list[Math.floor(Math.random() * list.length)]!)
  return picked
}

function pick() {
  const list = candidates.value
  if (!list.length) {
    result.value = []
    return
  }

  const rewardList = rewards.value
  if (rewardList.length) {
    let pool = shuffle(list)
    const picked: string[] = []
    for (const reward of rewardList) {
      const winners = uniqueOnly.value ? pool.splice(0, reward.count) : pickFromList(list, reward.count)
      picked.push(...winners.map((winner) => `${reward.name}: ${winner}`))
      if (uniqueOnly.value && !pool.length) break
    }
    result.value = picked
    return
  }

  const count = Math.max(1, Math.min(Number(pickCount.value) || 1, 200))
  pickCount.value = count
  result.value = pickFromList(list, count)
}

function clearAll() {
  sourceText.value = ''
  rangeText.value = ''
  excludeText.value = ''
  result.value = []
}
</script>

<template>
  <ToolPage name="picker" max-width="4xl" icon="i-lucide-list-checks">
    <ToolSection :title="$t('tools.picker.inputTitle')" :description="$t('tools.picker.inputDesc')">
      <UTextarea v-model="sourceText" :rows="8" :placeholder="$t('tools.picker.inputPlaceholder')" class="w-full" />
      <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <UFormField label="区间候选">
          <UInput v-model="rangeText" placeholder="如 1-100、1..30、30到1" />
        </UFormField>
        <UFormField label="排除选项">
          <UInput v-model="excludeText" placeholder="用逗号或换行分隔" />
        </UFormField>
      </div>
      <UFormField class="mt-4" label="奖励配置" description="每行一种奖励，格式如：一等奖*1、二等奖*2；留空则使用抽取数量。">
        <UTextarea v-model="rewardText" :rows="4" placeholder="一等奖*1\n二等奖*2" class="w-full" />
      </UFormField>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <UFormField :label="$t('tools.picker.pickCount')" class="w-32">
          <UInput :model-value="pickCount" type="number" :min="1" :max="200" @update:model-value="pickCount = Math.max(1, Math.min(Number($event) || 1, 200))" />
        </UFormField>
        <UCheckbox v-model="uniqueOnly" :label="$t('tools.picker.uniqueOnly')" />
        <UButton color="primary" class="rounded-full" icon="i-lucide-dices" @click="pick">{{ $t('tools.picker.pickNow') }}</UButton>
        <UButton color="neutral" variant="ghost" class="rounded-full" icon="i-lucide-eraser" @click="clearAll">{{ $t('tools.picker.clear') }}</UButton>
      </div>
      <div class="mt-3 text-xs text-muted">{{ $t('tools.picker.candidateCount', { count: candidates.length }) }}</div>
    </ToolSection>

    <ResultPanel :title="$t('tools.picker.resultTitle')" :value="resultText" pre-wrap>
      <template #actions>
        <CopyBtn :text="resultText" variant="button" :disabled="!result.length" />
      </template>
      <div v-if="result.length" class="space-y-2">
        <div v-for="(item, idx) in result" :key="`${item}-${idx}`" class="rounded-xl border border-default/70 bg-elevated/70 px-3 py-2 text-sm text-default">
          {{ idx + 1 }}. {{ item }}
        </div>
      </div>
      <div v-else class="text-sm text-muted">{{ $t('tools.picker.emptyResult') }}</div>
    </ResultPanel>
  </ToolPage>
</template>
