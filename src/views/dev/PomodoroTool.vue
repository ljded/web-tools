<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

type Phase = 'work' | 'break'

const workMinutes = usePersistedRef('web-tools:pomodoro:work-minutes', 25)
const breakMinutes = usePersistedRef('web-tools:pomodoro:break-minutes', 5)
const phase = usePersistedRef<Phase>('web-tools:pomodoro:phase', 'work')
const cycleCount = usePersistedRef('web-tools:pomodoro:cycle-count', 0)
const remainingSeconds = usePersistedRef('web-tools:pomodoro:remaining-seconds', 25 * 60)
const running = usePersistedRef('web-tools:pomodoro:running', false)
const fullscreen = ref(false)

let timer: ReturnType<typeof setInterval> | null = null

const currentPhaseSeconds = computed(() => (phase.value === 'work' ? workMinutes.value * 60 : breakMinutes.value * 60))

const progress = computed(() => {
  const total = currentPhaseSeconds.value
  if (total <= 0) return 0
  return Math.round(((total - remainingSeconds.value) / total) * 100)
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

function resetPhaseSeconds() {
  remainingSeconds.value = currentPhaseSeconds.value
}

function switchPhase() {
  if (phase.value === 'work') {
    phase.value = 'break'
    cycleCount.value += 1
  } else {
    phase.value = 'work'
  }
  resetPhaseSeconds()
}

function startTick() {
  stopTick()
  timer = setInterval(() => {
    if (!running.value) return
    if (remainingSeconds.value <= 0) {
      switchPhase()
      return
    }
    remainingSeconds.value -= 1
  }, 1000)
}

function applyWorkMinutes(value: number) {
  workMinutes.value = Math.max(1, Math.min(Number(value) || 25, 180))
  if (phase.value === 'work') resetPhaseSeconds()
}

function applyBreakMinutes(value: number) {
  breakMinutes.value = Math.max(1, Math.min(Number(value) || 5, 60))
  if (phase.value === 'break') resetPhaseSeconds()
}

function toggle() {
  running.value = !running.value
  if (running.value) startTick()
  else stopTick()
}

function skipPhase() {
  switchPhase()
}

function resetAll() {
  running.value = false
  phase.value = 'work'
  cycleCount.value = 0
  remainingSeconds.value = workMinutes.value * 60
  stopTick()
}

if (running.value) startTick()

onUnmounted(() => {
  stopTick()
})
</script>

<template>
  <ToolPage name="pomodoro" max-width="4xl" icon="i-lucide-timer-reset">
    <ToolSection :title="$t('tools.pomodoro.config')">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UFormField :label="$t('tools.pomodoro.workMinutes')">
          <UInput :model-value="workMinutes" type="number" :min="1" :max="180" @update:model-value="applyWorkMinutes(Number($event))" />
        </UFormField>
        <UFormField :label="$t('tools.pomodoro.breakMinutes')">
          <UInput :model-value="breakMinutes" type="number" :min="1" :max="60" @update:model-value="applyBreakMinutes(Number($event))" />
        </UFormField>
      </div>
    </ToolSection>

    <ToolSection :title="$t('tools.pomodoro.session')" compact>
      <div class="rounded-2xl border border-default/70 bg-elevated/70 p-6 text-center">
        <UBadge :color="phase === 'work' ? 'primary' : 'success'" variant="soft" size="lg">
          {{ phase === 'work' ? $t('tools.pomodoro.workPhase') : $t('tools.pomodoro.breakPhase') }}
        </UBadge>
        <div class="mt-4 text-5xl font-semibold tracking-widest text-highlighted">{{ displayTime }}</div>
        <UProgress class="mt-4" :model-value="progress" :max="100" />
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <UButton color="primary" class="rounded-full" @click="toggle">
            {{ running ? $t('tools.pomodoro.pause') : $t('tools.pomodoro.start') }}
          </UButton>
          <UButton color="neutral" variant="ghost" class="rounded-full" @click="skipPhase">
            {{ $t('tools.pomodoro.skip') }}
          </UButton>
          <UButton color="neutral" variant="ghost" class="rounded-full" @click="resetAll">
            {{ $t('tools.pomodoro.reset') }}
          </UButton>
          <UButton color="neutral" variant="ghost" icon="i-lucide-maximize-2" class="rounded-full" @click="fullscreen = true">
            全屏
          </UButton>
        </div>
      </div>
    </ToolSection>

    <ResultPanel :title="$t('tools.pomodoro.cyclesTitle')" :value="String(cycleCount)" compact />

    <div v-if="fullscreen" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-default p-6">
      <UButton color="neutral" variant="ghost" icon="i-lucide-minimize-2" class="absolute right-6 top-6 rounded-full" @click="fullscreen = false">退出全屏</UButton>
      <UBadge :color="phase === 'work' ? 'primary' : 'success'" variant="soft" size="lg">
        {{ phase === 'work' ? $t('tools.pomodoro.workPhase') : $t('tools.pomodoro.breakPhase') }}
      </UBadge>
      <div class="mt-8 text-[18vw] font-black leading-none tracking-widest text-highlighted">{{ displayTime }}</div>
      <UProgress class="mt-8 w-full max-w-4xl" :model-value="progress" :max="100" />
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <UButton color="primary" size="xl" class="rounded-full" @click="toggle">
          {{ running ? $t('tools.pomodoro.pause') : $t('tools.pomodoro.start') }}
        </UButton>
        <UButton color="neutral" variant="soft" size="xl" class="rounded-full" @click="skipPhase">
          {{ $t('tools.pomodoro.skip') }}
        </UButton>
        <UButton color="neutral" variant="soft" size="xl" class="rounded-full" @click="resetAll">
          {{ $t('tools.pomodoro.reset') }}
        </UButton>
      </div>
    </div>
  </ToolPage>
</template>
