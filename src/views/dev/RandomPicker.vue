<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const MAX_RANGE_ITEMS = 10000

const { t } = useI18n()

const sourceText = usePersistedRef('web-tools:picker:source', 'Apple\nBanana\nOrange\nGrape\nMango')
const rangeText = usePersistedRef('web-tools:picker:range', '')
const excludeText = usePersistedRef('web-tools:picker:exclude', '')
const rewardText = usePersistedRef('web-tools:picker:rewards', t('tools.picker.rewardPlaceholder'))
const pickCount = usePersistedRef('web-tools:picker:count', 1)
const uniqueOnly = usePersistedRef('web-tools:picker:unique', true)
const result = ref<string[]>([])

type Reward = { name: string; count: number }
type ParsedEntries = { items: string[]; truncated: boolean }

function parseOrderedLine(line: string) {
  return line
    .replace(/^\s*(?:\d+|[A-Za-z]|[\p{Script=Han}]+)[\.、\)）]\s*/u, '')
    .trim()
}

function normalizeLines(text: string) {
  return text
    .split(/\r?\n|[,，]/)
    .map(parseOrderedLine)
    .filter(Boolean)
}

function expandRangeToken(token: string, limit: number) {
  const match = token.trim().match(/^(-?\d+)\s*(?:\.\.|到|~|-)\s*(-?\d+)$/)
  if (!match || limit <= 0) return null

  const start = Number(match[1])
  const end = Number(match[2])
  const step = start <= end ? 1 : -1
  const values: string[] = []
  for (let current = start; step > 0 ? current <= end : current >= end; current += step) {
    values.push(String(current))
    if (values.length >= limit) break
  }
  return {
    values,
    truncated: values.at(-1) !== String(end),
  }
}

function tokenizeEntry(entry: string) {
  return entry.match(/-?\d+\s*(?:\.\.|到|~|-)\s*-?\d+|[^\s,，;；、]+/g) ?? []
}

function parseFlexibleEntries(text: string): ParsedEntries {
  const items: string[] = []
  let truncated = false
  const segments = text
    .split(/\r?\n|[,，;；、]/)
    .map(parseOrderedLine)
    .filter(Boolean)

  for (const segment of segments) {
    const segmentRange = expandRangeToken(segment, MAX_RANGE_ITEMS - items.length)
    if (segmentRange) {
      items.push(...segmentRange.values)
      truncated ||= segmentRange.truncated
    } else {
      for (const token of tokenizeEntry(segment)) {
        const range = expandRangeToken(token, MAX_RANGE_ITEMS - items.length)
        if (range) {
          items.push(...range.values)
          truncated ||= range.truncated
        } else {
          items.push(token.trim())
        }
        if (items.length >= MAX_RANGE_ITEMS) {
          truncated = true
          break
        }
      }
    }
    if (items.length >= MAX_RANGE_ITEMS) break
  }

  return { items: items.filter(Boolean), truncated }
}

const rangeEntries = computed(() => parseFlexibleEntries(rangeText.value))
const excludeEntries = computed(() => parseFlexibleEntries(excludeText.value))
const excluded = computed(() => new Set(excludeEntries.value.items))

const candidates = computed(() => {
  const source = [...rangeEntries.value.items, ...normalizeLines(sourceText.value)]
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
  if (!list.length) return []
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
  <ToolPage name="picker" max-width="6xl" icon="i-lucide-list-checks">
    <div class="tool-workspace">
      <div class="space-y-4">
        <ToolSection :title="$t('tools.picker.inputTitle')" :description="$t('tools.picker.inputDesc')">
          <div class="space-y-5">
            <UFormField :label="$t('tools.picker.sourceLabel')" :description="$t('tools.picker.sourceDesc')">
              <UTextarea v-model="sourceText" :rows="7" :placeholder="$t('tools.picker.inputPlaceholder')" class="w-full" />
            </UFormField>

            <div class="tool-control-grid">
              <UFormField :label="$t('tools.picker.rangeLabel')" :description="$t('tools.picker.rangeDesc')">
                <UTextarea v-model="rangeText" :rows="5" :placeholder="$t('tools.picker.rangePlaceholder')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('tools.picker.excludeLabel')" :description="$t('tools.picker.excludeDesc')">
                <UTextarea v-model="excludeText" :rows="5" :placeholder="$t('tools.picker.excludePlaceholder')" class="w-full" />
              </UFormField>
            </div>

            <UAlert
              v-if="rangeEntries.truncated || excludeEntries.truncated"
              color="warning"
              variant="soft"
              icon="i-lucide-triangle-alert"
              :description="$t('tools.picker.rangeLimitNotice')"
            />
          </div>
        </ToolSection>

        <ToolSection :title="$t('tools.picker.ruleTitle')" :description="$t('tools.picker.ruleDesc')">
          <div class="space-y-5">
            <UFormField :label="$t('tools.picker.rewardLabel')" :description="$t('tools.picker.rewardDesc')">
              <UTextarea v-model="rewardText" :rows="4" :placeholder="$t('tools.picker.rewardPlaceholder')" class="w-full" />
            </UFormField>

            <div class="tool-command-bar justify-between">
              <div class="flex flex-wrap items-center gap-3">
                <UFormField :label="$t('tools.picker.pickCount')" class="w-32">
                  <UInput :model-value="pickCount" type="number" :min="1" :max="200" class="w-full" @update:model-value="pickCount = Math.max(1, Math.min(Number($event) || 1, 200))" />
                </UFormField>
                <UCheckbox v-model="uniqueOnly" :label="$t('tools.picker.uniqueOnly')" />
              </div>
              <div class="flex flex-wrap gap-2">
                <UButton color="primary" class="rounded-full" icon="i-lucide-dices" @click="pick">{{ $t('tools.picker.pickNow') }}</UButton>
                <UButton color="neutral" variant="ghost" class="rounded-full" icon="i-lucide-eraser" @click="clearAll">{{ $t('tools.picker.clear') }}</UButton>
              </div>
            </div>
          </div>
        </ToolSection>
      </div>

      <div class="tool-preview-sticky space-y-4">
        <ToolSection :title="$t('tools.picker.overviewTitle')" compact>
          <div class="grid grid-cols-2 gap-3">
            <div class="tool-metric-card">
              <div class="text-2xl font-black text-highlighted">{{ candidates.length }}</div>
              <div class="text-xs text-muted">{{ $t('tools.picker.availableCandidates') }}</div>
            </div>
            <div class="tool-metric-card">
              <div class="text-2xl font-black text-highlighted">{{ excluded.size }}</div>
              <div class="text-xs text-muted">{{ $t('tools.picker.excludedCount') }}</div>
            </div>
          </div>
        </ToolSection>

        <ResultPanel :title="$t('tools.picker.resultTitle')" :value="resultText" pre-wrap>
          <div v-if="result.length" class="space-y-2">
            <div v-for="(item, idx) in result" :key="`${item}-${idx}`" class="tool-list-item px-3 py-2 text-sm text-default">
              {{ idx + 1 }}. {{ item }}
            </div>
          </div>
          <div v-else class="text-sm text-muted">{{ $t('tools.picker.emptyResult') }}</div>
        </ResultPanel>
      </div>
    </div>
  </ToolPage>
</template>
