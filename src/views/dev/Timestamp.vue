<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import { Clock } from '@lucide/vue'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolHeader from '@/components/ToolHeader.vue'
import ToolCard from '@/components/ToolCard.vue'
import CopyBtn from '@/components/CopyBtn.vue'
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

const dateInput = usePersistedRef('web-tools:ts:dateInput', dayjs().format('YYYY-MM-DD HH:mm:ss'))
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
  const fromOffset = parseOffset(tzFrom.value)
  const toOffset = parseOffset(tzTo.value)
  const diffMin = toOffset - fromOffset
  const result = d.add(diffMin, 'minute')
  return result.format('YYYY-MM-DD HH:mm:ss')
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
  const d1 = dayjs(diffDate1.value)
  const d2 = dayjs(diffDate2.value)
  if (!d1.isValid() || !d2.isValid()) return null
  const days = d2.diff(d1, 'day')
  const hours = d2.diff(d1, 'hour')
  const minutes = d2.diff(d1, 'minute')
  return { days, hours, minutes }
})
</script>

<template>
  <ToolLayout max-width="4xl">
    <ToolHeader title="时间戳工具" description="实时时间戳、日期转换、时区计算与日期差值" :icon="Clock" />
    <ToolCard title="实时时间戳">
      <div class="mb-4 rounded-xl bg-primary-container/40 p-4">
        <div class="text-xs text-on-surface-variant">本地时间</div>
        <div class="mt-1 text-2xl font-medium text-on-surface">{{ nowDate }}</div>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="rounded-xl bg-surface-variant/50 p-4">
          <div class="text-xs text-on-surface-variant">秒 (s)</div>
          <div class="mt-1 flex items-center justify-between">
            <span class="font-mono text-xl text-on-surface">{{ nowTs }}</span>
            <CopyBtn :text="String(nowTs)" />
          </div>
        </div>
        <div class="rounded-xl bg-surface-variant/50 p-4">
          <div class="text-xs text-on-surface-variant">毫秒 (ms)</div>
          <div class="mt-1 flex items-center justify-between">
            <span class="font-mono text-xl text-on-surface">{{ nowMs }}</span>
            <CopyBtn :text="String(nowMs)" />
          </div>
        </div>
      </div>
    </ToolCard>

    <ToolCard title="日期转时间戳">
      <div class="flex flex-wrap items-center gap-3">
        <UInput
          v-model="dateInput"
          placeholder="YYYY-MM-DD HH:mm:ss"
          class="h-11 w-full flex-1"
        />
      </div>
      <div v-if="dateTs" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="rounded-xl bg-surface-variant/50 p-3">
          <div class="text-xs text-on-surface-variant">秒</div>
          <div class="mt-1 flex items-center justify-between">
            <span class="font-mono text-on-surface">{{ dateTs.s }}</span>
            <CopyBtn :text="String(dateTs.s)" />
          </div>
        </div>
        <div class="rounded-xl bg-surface-variant/50 p-3">
          <div class="text-xs text-on-surface-variant">毫秒</div>
          <div class="mt-1 flex items-center justify-between">
            <span class="font-mono text-on-surface">{{ dateTs.ms }}</span>
            <CopyBtn :text="String(dateTs.ms)" />
          </div>
        </div>
      </div>
    </ToolCard>

    <ToolCard title="时间戳转日期">
      <div class="flex flex-wrap items-center gap-3">
        <UInput
          v-model="tsInput"
          placeholder="输入时间戳"
          class="h-11 w-full flex-1"
        />
        <USelect
          v-model="tsUnit"
          :options="[{ label: '秒', value: 's' }, { label: '毫秒', value: 'ms' }]"
          class="h-11"
        />
      </div>
      <div v-if="tsDate" class="mt-4 rounded-xl bg-surface-variant/50 p-3">
        <div class="text-xs text-on-surface-variant">日期时间</div>
        <div class="mt-1 flex items-center justify-between">
          <span class="font-mono text-on-surface">{{ tsDate }}</span>
          <CopyBtn :text="tsDate" />
        </div>
      </div>
    </ToolCard>

    <ToolCard title="时区计算">
      <div class="flex flex-wrap items-center gap-3">
        <UInput
          v-model="tzDate"
          placeholder="YYYY-MM-DD HH:mm:ss"
          class="h-11 w-full flex-1"
        />
        <USelect
          v-model="tzFrom"
          :options="timezones.map(tz => ({ label: `${tz.label} (${tz.value})`, value: tz.value }))"
          class="h-11"
        />
        <span class="text-on-surface-variant">→</span>
        <USelect
          v-model="tzTo"
          :options="timezones.map(tz => ({ label: `${tz.label} (${tz.value})`, value: tz.value }))"
          class="h-11"
        />
      </div>
      <div v-if="tzResult" class="mt-4 rounded-xl bg-surface-variant/50 p-3">
        <div class="text-xs text-on-surface-variant">转换后</div>
        <div class="mt-1 flex items-center justify-between">
          <span class="font-mono text-on-surface">{{ tzResult }}</span>
          <CopyBtn :text="tzResult" />
        </div>
      </div>
    </ToolCard>

    <ToolCard title="日期差值计算器">
      <div class="flex flex-wrap items-center gap-3">
        <UInput
          v-model="diffDate1"
          type="date"
          class="h-11 w-full flex-1"
        />
        <span class="text-on-surface-variant">到</span>
        <UInput
          v-model="diffDate2"
          type="date"
          class="h-11 w-full flex-1"
        />
      </div>
      <div v-if="diffResult" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-surface-variant/50 p-3 text-center">
          <div class="text-xs text-on-surface-variant">相差天数</div>
          <div class="mt-1 text-xl font-medium text-on-surface">{{ diffResult.days }}</div>
        </div>
        <div class="rounded-xl bg-surface-variant/50 p-3 text-center">
          <div class="text-xs text-on-surface-variant">相差小时</div>
          <div class="mt-1 text-xl font-medium text-on-surface">{{ diffResult.hours }}</div>
        </div>
        <div class="rounded-xl bg-surface-variant/50 p-3 text-center">
          <div class="text-xs text-on-surface-variant">相差分钟</div>
          <div class="mt-1 text-xl font-medium text-on-surface">{{ diffResult.minutes }}</div>
        </div>
      </div>
    </ToolCard>
  </ToolLayout>
</template>
