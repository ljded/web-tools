<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const totalSeconds = usePersistedRef('web-tools:timer:total-seconds', 300)
const remainingSeconds = usePersistedRef('web-tools:timer:remaining-seconds', 300)
const running = usePersistedRef('web-tools:timer:running', false)
const quickMinutesText = usePersistedRef('web-tools:timer:quick-minutes', '1,3,5,10,15')
const fullscreen = ref(false)

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

function startTick() {
  stopTick()
  timer = setInterval(() => {
    if (!running.value) return
    if (remainingSeconds.value <= 0) {
      running.value = false
      stopTick()
      return
    }
    remainingSeconds.value -= 1
  }, 1000)
}

function setPreset(seconds: number) {
  const safe = Math.max(1, Math.min(seconds, 24 * 60 * 60))
  totalSeconds.value = safe
  remainingSeconds.value = safe
  running.value = false
  stopTick()
}

function setCustomMinutes(value: number) {
  const safe = Math.max(1, Math.min(Number(value) || 1, 24 * 60))
  setPreset(safe * 60)
}

function toggle() {
  if (remainingSeconds.value <= 0) {
    remainingSeconds.value = totalSeconds.value
  }
  running.value = !running.value
  if (running.value) startTick()
  else stopTick()
}

function reset() {
  running.value = false
  remainingSeconds.value = totalSeconds.value
  stopTick()
}

if (running.value) startTick()

onUnmounted(() => {
  stopTick()
})
</script>

<template>
  <ToolPage name="timer" max-width="4xl" icon="i-lucide-timer">
    <ToolSection :title="$t('tools.timer.quickSet')">
      <div class="flex flex-wrap gap-2">
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
      <div class="mt-4">
        <UFormField label="自定义快捷时间（分钟）">
          <UInput v-model="quickMinutesText" placeholder="如 1,3,5,10,15" />
        </UFormField>
      </div>
      <div class="mt-4">
        <UFormField :label="$t('tools.timer.customMinutes')">
          <UInput :model-value="Math.round(totalSeconds / 60)" type="number" :min="1" :max="1440" @update:model-value="setCustomMinutes(Number($event))" />
        </UFormField>
      </div>
    </ToolSection>

    <ToolSection :title="$t('tools.timer.countdown')" compact>
      <div class="rounded-2xl border border-default/70 bg-elevated/70 p-6 text-center">
        <div class="text-5xl font-semibold tracking-widest text-highlighted">{{ displayTime }}</div>
        <UProgress class="mt-4" :model-value="progress" :max="100" />
        <div class="mt-4 flex justify-center gap-2">
          <UButton color="primary" class="rounded-full" @click="toggle">
            {{ running ? $t('tools.timer.pause') : $t('tools.timer.start') }}
          </UButton>
          <UButton color="neutral" variant="ghost" class="rounded-full" icon="i-lucide-maximize-2" @click="fullscreen = true">
            全屏
          </UButton>
        </div>
      </div>
    </ToolSection>

    <div v-if="fullscreen" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-default p-6">
      <UButton color="neutral" variant="ghost" icon="i-lucide-minimize-2" class="absolute right-6 top-6 rounded-full" @click="fullscreen = false">退出全屏</UButton>
      <div class="text-[18vw] font-black leading-none tracking-widest text-highlighted">{{ displayTime }}</div>
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
