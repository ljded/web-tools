<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { useToolState } from '@/composables'
import { usePersistedRef } from '@/utils/persist'

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
  { label: 'UTC', value: '+00:00' },
  { label: '北京/上海', value: '+08:00' },
  { label: '东京', value: '+09:00' },
  { label: '纽约', value: '-05:00' },
  { label: '洛杉矶', value: '-08:00' },
  { label: '伦敦', value: '+00:00' },
  { label: '巴黎', value: '+01:00' },
  { label: '悉尼', value: '+11:00' },
]

const diffDate1 = usePersistedRef('web-tools:ts:diffDate1', dayjs().format('YYYY-MM-DD'))
const diffDate2 = usePersistedRef('web-tools:ts:diffDate2', dayjs().add(7, 'day').format('YYYY-MM-DD'))
const diffResult = computed(() => {
  const d1 = dayjs(diffDate1.value), d2 = dayjs(diffDate2.value)
  if (!d1.isValid() || !d2.isValid()) return null
  return { days: d2.diff(d1, 'day'), hours: d2.diff(d1, 'hour'), minutes: d2.diff(d1, 'minute') }
})
</script>

<template>
  <ToolPage name="timestamp" max-width="4xl">
    <ToolSection title="实时时间戳">
      <ResultPanel title="本地时间" :value="nowDate" color="primary" :monospace="false" compact />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ResultPanel title="秒 (s)" :value="String(nowTs)" compact />
        <ResultPanel title="毫秒 (ms)" :value="String(nowMs)" compact />
      </div>
    </ToolSection>

    <ToolSection title="日期转时间戳">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-medium text-muted">输入日期</span>
        <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
      </div>
      <UInput v-model="dateInput" @blur="saveHistory" placeholder="YYYY-MM-DD HH:mm:ss" class="w-full" />
      <div v-if="dateTs" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ResultPanel title="秒" :value="String(dateTs.s)" compact />
        <ResultPanel title="毫秒" :value="String(dateTs.ms)" compact />
      </div>
    </ToolSection>

    <ToolSection title="时间戳转日期">
      <div class="flex flex-wrap items-center gap-3">
        <UInput v-model="tsInput" placeholder="输入时间戳" class="flex-1" />
        <USelect v-model="tsUnit" :items="[{ label: '秒', value: 's' }, { label: '毫秒', value: 'ms' }]" />
      </div>
      <ResultPanel v-if="tsDate" class="mt-4" title="日期时间" :value="tsDate" compact />
    </ToolSection>

    <ToolSection title="时区计算">
      <div class="flex flex-wrap items-center gap-3">
        <UInput v-model="tzDate" placeholder="YYYY-MM-DD HH:mm:ss" class="flex-1" />
        <USelect v-model="tzFrom" :items="timezones.map(tz => ({ label: `${tz.label} (${tz.value})`, value: tz.value }))" />
        <span class="text-muted">→</span>
        <USelect v-model="tzTo" :items="timezones.map(tz => ({ label: `${tz.label} (${tz.value})`, value: tz.value }))" />
      </div>
      <ResultPanel v-if="tzResult" class="mt-4" title="转换后" :value="tzResult" compact />
    </ToolSection>

    <ToolSection title="日期差值计算器">
      <div class="flex flex-wrap items-center gap-3">
        <UInput v-model="diffDate1" type="date" class="w-44" />
        <span class="text-muted">→</span>
        <UInput v-model="diffDate2" type="date" class="w-44" />
      </div>
      <div v-if="diffResult" class="mt-4 grid grid-cols-3 gap-3">
        <div class="rounded-xl bg-elevated p-3 text-center">
          <div class="text-2xl font-bold text-primary">{{ diffResult.days }}</div>
          <div class="text-xs text-muted">天</div>
        </div>
        <div class="rounded-xl bg-elevated p-3 text-center">
          <div class="text-2xl font-bold text-primary">{{ diffResult.hours }}</div>
          <div class="text-xs text-muted">小时</div>
        </div>
        <div class="rounded-xl bg-elevated p-3 text-center">
          <div class="text-2xl font-bold text-primary">{{ diffResult.minutes }}</div>
          <div class="text-xs text-muted">分钟</div>
        </div>
      </div>
    </ToolSection>
  </ToolPage>
</template>
