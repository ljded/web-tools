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
  <ToolPage name="timestamp" max-width="6xl">
    <div class="tool-workspace">
      <div class="space-y-4">
        <ToolSection title="日期与时间戳转换" description="把常用时间格式、Unix 时间戳和不同时区集中在一个操作面板里。">
          <div class="space-y-5">
            <div class="tool-command-bar justify-between">
              <div>
                <div class="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Live Clock</div>
                <div class="mt-1 text-sm text-muted">{{ nowDate }}</div>
              </div>
              <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
            </div>

            <div class="tool-control-grid">
              <UFormField label="日期转时间戳" description="支持 YYYY-MM-DD HH:mm:ss 等常见格式。">
                <UInput v-model="dateInput" @blur="saveHistory" placeholder="YYYY-MM-DD HH:mm:ss" class="w-full" />
              </UFormField>
              <UFormField label="时间戳转日期">
                <div class="flex gap-2">
                  <UInput v-model="tsInput" placeholder="输入时间戳" class="min-w-0 flex-1" />
                  <USelect v-model="tsUnit" :items="[{ label: '秒', value: 's' }, { label: '毫秒', value: 'ms' }]" class="w-28" />
                </div>
              </UFormField>
            </div>
          </div>
        </ToolSection>

        <ToolSection title="时区与差值" description="快速换算固定 UTC 偏移，并计算两个日期之间的跨度。">
          <div class="space-y-5">
            <div class="tool-control-grid">
              <UFormField label="原始时间">
                <UInput v-model="tzDate" placeholder="YYYY-MM-DD HH:mm:ss" class="w-full" />
              </UFormField>
              <UFormField label="从时区">
                <USelect v-model="tzFrom" :items="timezones.map(tz => ({ label: `${tz.label} (${tz.value})`, value: tz.value }))" class="w-full" />
              </UFormField>
              <UFormField label="到时区">
                <USelect v-model="tzTo" :items="timezones.map(tz => ({ label: `${tz.label} (${tz.value})`, value: tz.value }))" class="w-full" />
              </UFormField>
            </div>

            <div class="tool-control-grid">
              <UFormField label="开始日期">
                <UInput v-model="diffDate1" type="date" class="w-full" />
              </UFormField>
              <UFormField label="结束日期">
                <UInput v-model="diffDate2" type="date" class="w-full" />
              </UFormField>
            </div>
          </div>
        </ToolSection>
      </div>

      <div class="tool-preview-sticky space-y-4">
        <ToolSection title="实时结果" compact>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <ResultPanel title="本地时间" :value="nowDate" color="primary" :monospace="false" compact />
            <ResultPanel title="当前秒级时间戳" :value="String(nowTs)" compact />
            <ResultPanel title="当前毫秒时间戳" :value="String(nowMs)" compact />
          </div>
        </ToolSection>

        <ToolSection title="转换输出" compact>
          <div class="space-y-3">
            <div v-if="dateTs" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <ResultPanel title="日期 → 秒" :value="String(dateTs.s)" compact />
              <ResultPanel title="日期 → 毫秒" :value="String(dateTs.ms)" compact />
            </div>
            <ResultPanel v-if="tsDate" title="时间戳 → 日期" :value="tsDate" compact />
            <ResultPanel v-if="tzResult" title="时区转换" :value="tzResult" compact />
            <div v-if="diffResult" class="grid grid-cols-3 gap-3">
              <div class="tool-metric-card text-center">
                <div class="text-2xl font-bold text-primary">{{ diffResult.days }}</div>
                <div class="text-xs text-muted">天</div>
              </div>
              <div class="tool-metric-card text-center">
                <div class="text-2xl font-bold text-primary">{{ diffResult.hours }}</div>
                <div class="text-xs text-muted">小时</div>
              </div>
              <div class="tool-metric-card text-center">
                <div class="text-2xl font-bold text-primary">{{ diffResult.minutes }}</div>
                <div class="text-xs text-muted">分钟</div>
              </div>
            </div>
          </div>
        </ToolSection>
      </div>
    </div>
  </ToolPage>
</template>
