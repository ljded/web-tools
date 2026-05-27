<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { useToolState } from '@/composables'
import { usePersistedRef } from '@/utils/persist'

const { t } = useI18n()

const nowTs = ref(Math.floor(Date.now() / 1000))
const nowMs = ref(Date.now())
const nowDate = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'))
let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => {
    nowTs.value = Math.floor(Date.now() / 1000)
    nowMs.value = Date.now()
    nowDate.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
  }, 1000)
})
onUnmounted(() => clearInterval(timer))

const { input: dateInput, history, saveHistory } = useToolState<string, { dateInput: string }>({
  storageKey: 'timestamp',
  defaultInput: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  getHistoryData: (value) => ({ dateInput: value }),
  historyOptions: { maxCount: 10, generateLabel: (d) => d.dateInput.slice(0, 30) },
})

function onHistorySelect(item: { data: { dateInput: string } }) { dateInput.value = item.data.dateInput }

const dateTs = computed(() => {
  const d = dayjs(dateInput.value)
  return d.isValid() ? { s: d.valueOf() / 1000, ms: d.valueOf() } : null
})

const tsInput = usePersistedRef('web-tools:ts:tsInput', Math.floor(Date.now() / 1000).toString())
const tsUnit = usePersistedRef<'s' | 'ms'>('web-tools:ts:tsUnit', 's')
const tsDate = computed(() => {
  const n = Number(tsInput.value)
  if (!n || isNaN(n)) return null
  const ms = tsUnit.value === 's' ? n * 1000 : n
  const d = dayjs(ms)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : null
})

const tzDate = usePersistedRef('web-tools:ts:tzDate', dayjs().format('YYYY-MM-DD HH:mm:ss'))
const tzFrom = usePersistedRef('web-tools:ts:tzFrom', dayjs().format('Z'))
const tzTo = usePersistedRef('web-tools:ts:tzTo', '+00:00')
const tzResult = computed(() => {
  const d = dayjs(tzDate.value)
  if (!d.isValid()) return null
  const parseOffset = (tz: string) => {
    const sign = tz.startsWith('-') ? -1 : 1
    const [h = 0, m = 0] = tz.replace('+', '').replace('-', '').split(':').map(Number)
    return sign * (h * 60 + m)
  }
  const diffMin = parseOffset(tzTo.value) - parseOffset(tzFrom.value)
  return d.add(diffMin, 'minute').format('YYYY-MM-DD HH:mm:ss')
})

const timezones = [
  { key: 'utc', value: '+00:00' },
  { key: 'beijing', value: '+08:00' },
  { key: 'tokyo', value: '+09:00' },
  { key: 'newYork', value: '-05:00' },
  { key: 'losAngeles', value: '-08:00' },
  { key: 'london', value: '+00:00' },
  { key: 'paris', value: '+01:00' },
  { key: 'sydney', value: '+11:00' },
]

const timestampUnitOptions = computed(() => [
  { label: t('tools.timestamp.second'), value: 's' },
  { label: t('tools.timestamp.millisecond'), value: 'ms' },
])
const timezoneOptions = computed(() =>
  timezones.map((timezone) => ({
    label: `${t(`tools.timestamp.timezones.${timezone.key}`)} (${timezone.value})`,
    value: timezone.value,
  })),
)

const diffDate1 = usePersistedRef('web-tools:ts:diffDate1', dayjs().format('YYYY-MM-DD'))
const diffDate2 = usePersistedRef('web-tools:ts:diffDate2', dayjs().add(7, 'day').format('YYYY-MM-DD'))
const diffResult = computed(() => {
  const d1 = dayjs(diffDate1.value), d2 = dayjs(diffDate2.value)
  if (!d1.isValid() || !d2.isValid()) return null
  return { days: d2.diff(d1, 'day'), hours: d2.diff(d1, 'hour'), minutes: d2.diff(d1, 'minute') }
})
</script>

<template>
  <ToolPage name="timestamp" max-width="6xl" icon="i-lucide-calendar-clock">
    <div class="tool-workspace">
      <div class="space-y-4">
        <ToolSection :title="$t('tools.timestamp.convertTitle')" :description="$t('tools.timestamp.convertDesc')">
          <div class="space-y-5">
            <div class="tool-command-bar justify-between">
              <div>
                <div class="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">{{ $t('tools.timestamp.liveClock') }}</div>
                <div class="mt-1 text-sm text-muted">{{ nowDate }}</div>
              </div>
              <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
            </div>

            <div class="tool-control-grid">
              <UFormField :label="$t('tools.timestamp.dateToTimestamp')" :description="$t('tools.timestamp.dateToTimestampDesc')">
                <UInput v-model="dateInput" @blur="saveHistory" placeholder="YYYY-MM-DD HH:mm:ss" class="w-full" />
              </UFormField>
              <UFormField :label="$t('tools.timestamp.timestampToDate')">
                <div class="flex gap-2">
                  <UInput v-model="tsInput" :placeholder="$t('tools.timestamp.tsPlaceholder')" class="min-w-0 flex-1" />
                  <USelect v-model="tsUnit" :items="timestampUnitOptions" class="w-28" />
                </div>
              </UFormField>
            </div>
          </div>
        </ToolSection>

        <ToolSection :title="$t('tools.timestamp.timezoneAndDiff')" :description="$t('tools.timestamp.timezoneAndDiffDesc')">
          <div class="space-y-5">
            <div class="tool-control-grid">
              <UFormField :label="$t('tools.timestamp.originalTime')">
                <UInput v-model="tzDate" placeholder="YYYY-MM-DD HH:mm:ss" class="w-full" />
              </UFormField>
              <UFormField :label="$t('tools.timestamp.fromTimezone')">
                <USelect v-model="tzFrom" :items="timezoneOptions" class="w-full" />
              </UFormField>
              <UFormField :label="$t('tools.timestamp.toTimezone')">
                <USelect v-model="tzTo" :items="timezoneOptions" class="w-full" />
              </UFormField>
            </div>

            <div class="tool-control-grid">
              <UFormField :label="$t('tools.timestamp.startDate')">
                <UInput v-model="diffDate1" type="date" class="w-full" />
              </UFormField>
              <UFormField :label="$t('tools.timestamp.endDate')">
                <UInput v-model="diffDate2" type="date" class="w-full" />
              </UFormField>
            </div>
          </div>
        </ToolSection>
      </div>

      <div class="tool-preview-sticky space-y-4">
        <ToolSection :title="$t('tools.timestamp.liveResult')" compact>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <ResultPanel :title="$t('tools.timestamp.localTime')" :value="nowDate" color="primary" :monospace="false" compact />
            <ResultPanel :title="$t('tools.timestamp.currentSecondTimestamp')" :value="String(nowTs)" compact />
            <ResultPanel :title="$t('tools.timestamp.currentMillisecondTimestamp')" :value="String(nowMs)" compact />
          </div>
        </ToolSection>

        <ToolSection :title="$t('tools.timestamp.convertOutput')" compact>
          <div class="space-y-3">
            <div v-if="dateTs" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <ResultPanel :title="$t('tools.timestamp.dateToSecond')" :value="String(dateTs.s)" compact />
              <ResultPanel :title="$t('tools.timestamp.dateToMillisecond')" :value="String(dateTs.ms)" compact />
            </div>
            <ResultPanel v-if="tsDate" :title="$t('tools.timestamp.timestampToDateResult')" :value="tsDate" compact />
            <ResultPanel v-if="tzResult" :title="$t('tools.timestamp.timezoneConvertResult')" :value="tzResult" compact />
            <div v-if="diffResult" class="grid grid-cols-3 gap-3">
              <div class="tool-metric-card text-center">
                <div class="text-2xl font-bold text-primary">{{ diffResult.days }}</div>
                <div class="text-xs text-muted">{{ $t('tools.timestamp.days') }}</div>
              </div>
              <div class="tool-metric-card text-center">
                <div class="text-2xl font-bold text-primary">{{ diffResult.hours }}</div>
                <div class="text-xs text-muted">{{ $t('tools.timestamp.hours') }}</div>
              </div>
              <div class="tool-metric-card text-center">
                <div class="text-2xl font-bold text-primary">{{ diffResult.minutes }}</div>
                <div class="text-xs text-muted">{{ $t('tools.timestamp.minutes') }}</div>
              </div>
            </div>
          </div>
        </ToolSection>
      </div>
    </div>
  </ToolPage>
</template>
