<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useReminder } from '@/composables/useReminder'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const totalSeconds = usePersistedRef('web-tools:timer:total-seconds', 300)
const remainingSeconds = usePersistedRef('web-tools:timer:remaining-seconds', 300)
const deadlineAt = usePersistedRef<number | null>('web-tools:timer:deadline-at', null)
const running = usePersistedRef('web-tools:timer:running', false)
const quickMinutesText = usePersistedRef('web-tools:timer:quick-minutes', '1,3,5,10,15')
const fullscreen = ref(false)
const { notify, primeAudio } = useReminder()

let timer: ReturnType<typeof setInterval> | null = null

const presets = computed(() => {
  const values = quickMinutesText.value
    .split(/[,，\s]+/)
    .map((item) => Math.max(1, Math.min(Number(item) || 0, 1440)))
    .filter((item, index, arr) => item > 0 && arr.indexOf(item) === index)
  return (values.length ? values : [5]).map((minutes) => ({ label: `${minutes}m`, seconds: minutes * 60 }))
})

const progress = computed(() => {
  if (totalSeconds.value <= 0) return 0
  return Math.round(((totalSeconds.value - remainingSeconds.value) / totalSeconds.value) * 100)
})

const displayTime = computed(() => {
  const m = Math.floor(remainingSeconds.value / 60)
  const s = remainingSeconds.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

function stopTick() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

function completeTimer() {
  remainingSeconds.value = 0
  running.value = false
  deadlineAt.value = null
  stopTick()
  notify({
    title: '计时结束',
    description: '倒计时已经完成。',
    color: 'success',
    icon: 'i-lucide-alarm-clock-check',
  })
}

function reconcileTime() {
  if (!running.value) return
  if (!deadlineAt.value) {
    deadlineAt.value = Date.now() + remainingSeconds.value * 1000
  }

  const nextRemaining = Math.max(0, Math.ceil((deadlineAt.value - Date.now()) / 1000))
  remainingSeconds.value = nextRemaining
  if (nextRemaining <= 0) completeTimer()
}

function startTick() {
  stopTick()
  if (!deadlineAt.value) {
    deadlineAt.value = Date.now() + Math.max(remainingSeconds.value, 1) * 1000
  }
  reconcileTime()
  if (!running.value) return
  timer = setInterval(reconcileTime, 500)
}

function setPreset(seconds: number) {
  const safe = Math.max(1, Math.min(seconds, 24 * 60 * 60))
  totalSeconds.value = safe
  remainingSeconds.value = safe
  deadlineAt.value = null
  running.value = false
  stopTick()
}

function setCustomMinutes(value: number) {
  const safe = Math.max(1, Math.min(Number(value) || 1, 24 * 60))
  setPreset(safe * 60)
}

function toggle() {
  if (running.value) {
    reconcileTime()
    running.value = false
    deadlineAt.value = null
    stopTick()
    return
  }

  if (remainingSeconds.value <= 0) {
    remainingSeconds.value = totalSeconds.value
  }
  running.value = true
  deadlineAt.value = Date.now() + remainingSeconds.value * 1000
  void primeAudio()
  startTick()
}

function reset() {
  running.value = false
  deadlineAt.value = null
  remainingSeconds.value = totalSeconds.value
  stopTick()
}

function handleVisibilityChange() {
  if (!document.hidden) reconcileTime()
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  if (running.value) startTick()
})

onUnmounted(() => {
  stopTick()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <ToolPage name="timer" max-width="6xl" icon="i-lucide-timer">
    <div class="tool-workspace">
      <ToolSection :title="$t('tools.timer.quickSet')" description="预设、快捷按钮和自定义时间集中在左侧，倒计时状态始终保持可见。">
        <div class="space-y-5">
          <div class="tool-command-bar">
            <UButton
              v-for="preset in presets"
              :key="preset.seconds"
              color="neutral"
              variant="soft"
              class="rounded-full"
              @click="setPreset(preset.seconds)"
            >
              {{ preset.label }}
            </UButton>
          </div>
          <div class="tool-control-grid">
            <UFormField label="自定义快捷时间（分钟）" description="用逗号、空格分隔，例如 1,3,5,10。">
              <UInput v-model="quickMinutesText" placeholder="如 1,3,5,10,15" class="w-full" />
            </UFormField>
            <UFormField :label="$t('tools.timer.customMinutes')">
              <UInput :model-value="Math.round(totalSeconds / 60)" type="number" :min="1" :max="1440" class="w-full" @update:model-value="setCustomMinutes(Number($event))" />
            </UFormField>
          </div>
          <UAlert color="primary" variant="soft" icon="i-lucide-info" description="切到后台或最小化后会按真实时间校准，结束时会弹出提示并播放提醒音。" />
        </div>
      </ToolSection>

      <div class="tool-preview-sticky">
        <ToolSection :title="$t('tools.timer.countdown')" compact>
          <div class="tool-stage p-6 text-center shadow-inner shadow-default/5">
            <UBadge :color="running ? 'primary' : remainingSeconds <= 0 ? 'success' : 'neutral'" variant="soft" class="mb-4 rounded-full">
              {{ running ? '计时中' : remainingSeconds <= 0 ? '已结束' : '已暂停' }}
            </UBadge>
            <div class="text-6xl font-black tracking-widest text-highlighted sm:text-7xl">{{ displayTime }}</div>
            <UProgress class="mt-5" :model-value="progress" :max="100" />
            <div class="mt-5 flex flex-wrap justify-center gap-2">
              <UButton color="primary" class="rounded-full" @click="toggle">
                {{ running ? $t('tools.timer.pause') : $t('tools.timer.start') }}
              </UButton>
              <UButton color="neutral" variant="soft" class="rounded-full" @click="reset">
                {{ $t('tools.timer.reset') }}
              </UButton>
              <UButton color="neutral" variant="ghost" class="rounded-full" icon="i-lucide-maximize-2" @click="fullscreen = true">
                全屏
              </UButton>
            </div>
          </div>
        </ToolSection>
      </div>
    </div>

    <div v-if="fullscreen" class="tool-fullscreen-stage fixed inset-0 z-50 flex flex-col items-center justify-center p-6">
      <UButton color="neutral" variant="ghost" icon="i-lucide-minimize-2" class="absolute right-6 top-6 rounded-full" @click="fullscreen = false">退出全屏</UButton>
      <UBadge :color="running ? 'primary' : remainingSeconds <= 0 ? 'success' : 'neutral'" variant="soft" size="lg" class="rounded-full">
        {{ running ? '计时中' : remainingSeconds <= 0 ? '已结束' : '已暂停' }}
      </UBadge>
      <div class="mt-8 text-[18vw] font-black leading-none tracking-widest text-highlighted">{{ displayTime }}</div>
      <UProgress class="mt-8 w-full max-w-4xl" :model-value="progress" :max="100" />
      <div class="mt-8 flex justify-center gap-3">
        <UButton color="primary" size="xl" class="rounded-full" @click="toggle">
          {{ running ? $t('tools.timer.pause') : $t('tools.timer.start') }}
        </UButton>
        <UButton color="neutral" variant="soft" size="xl" class="rounded-full" @click="reset">
          {{ $t('tools.timer.reset') }}
        </UButton>
      </div>
    </div>
  </ToolPage>
</template>