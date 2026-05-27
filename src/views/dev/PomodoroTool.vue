<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ResultPanel from '@/components/ResultPanel.vue'
import { useReminder } from '@/composables/useReminder'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

type Phase = 'work' | 'break'

const { t } = useI18n()

const workMinutes = usePersistedRef('web-tools:pomodoro:work-minutes', 25)
const breakMinutes = usePersistedRef('web-tools:pomodoro:break-minutes', 5)
const phase = usePersistedRef<Phase>('web-tools:pomodoro:phase', 'work')
const cycleCount = usePersistedRef('web-tools:pomodoro:cycle-count', 0)
const remainingSeconds = usePersistedRef('web-tools:pomodoro:remaining-seconds', 25 * 60)
const deadlineAt = usePersistedRef<number | null>('web-tools:pomodoro:deadline-at', null)
const running = usePersistedRef('web-tools:pomodoro:running', false)
const fullscreen = ref(false)
const { notify, primeAudio } = useReminder()

let timer: ReturnType<typeof setInterval> | null = null
let switchingPhase = false

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

function remindPhaseEnd(completedPhase: Phase) {
  notify({
    title: completedPhase === 'work' ? t('tools.pomodoro.workDoneTitle') : t('tools.pomodoro.breakDoneTitle'),
    description: completedPhase === 'work' ? t('tools.pomodoro.workDoneDesc') : t('tools.pomodoro.breakDoneDesc'),
    color: completedPhase === 'work' ? 'success' : 'primary',
    icon: completedPhase === 'work' ? 'i-lucide-coffee' : 'i-lucide-timer-reset',
  })
}

async function switchPhase(shouldNotify = false) {
  if (switchingPhase) return
  switchingPhase = true
  const completedPhase = phase.value
  try {
    if (phase.value === 'work') {
      phase.value = 'break'
      cycleCount.value += 1
    } else {
      phase.value = 'work'
    }
    await nextTick()
    resetPhaseSeconds()
    deadlineAt.value = running.value ? Date.now() + remainingSeconds.value * 1000 : null
    if (shouldNotify) remindPhaseEnd(completedPhase)
  } finally {
    switchingPhase = false
  }
}

function reconcileTime() {
  if (!running.value) return
  if (!deadlineAt.value) {
    deadlineAt.value = Date.now() + remainingSeconds.value * 1000
  }

  const nextRemaining = Math.max(0, Math.ceil((deadlineAt.value - Date.now()) / 1000))
  remainingSeconds.value = nextRemaining
  if (nextRemaining <= 0) {
    void switchPhase(true)
  }
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

function applyWorkMinutes(value: number) {
  workMinutes.value = Math.max(1, Math.min(Number(value) || 25, 180))
  if (phase.value !== 'work') return
  resetPhaseSeconds()
  deadlineAt.value = running.value ? Date.now() + remainingSeconds.value * 1000 : null
}

function applyBreakMinutes(value: number) {
  breakMinutes.value = Math.max(1, Math.min(Number(value) || 5, 60))
  if (phase.value !== 'break') return
  resetPhaseSeconds()
  deadlineAt.value = running.value ? Date.now() + remainingSeconds.value * 1000 : null
}

function toggle() {
  if (running.value) {
    reconcileTime()
    running.value = false
    deadlineAt.value = null
    stopTick()
    return
  }

  if (remainingSeconds.value <= 0) resetPhaseSeconds()
  running.value = true
  deadlineAt.value = Date.now() + remainingSeconds.value * 1000
  void primeAudio()
  startTick()
}

function skipPhase() {
  void switchPhase(false)
}

function resetAll() {
  running.value = false
  deadlineAt.value = null
  phase.value = 'work'
  cycleCount.value = 0
  remainingSeconds.value = workMinutes.value * 60
  stopTick()
}

function handleVisibilityChange() {
  if (!document.hidden) reconcileTime()
}

const sessionStatusText = computed(() => (running.value ? t('tools.pomodoro.running') : t('tools.pomodoro.paused')))

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
  <ToolPage name="pomodoro" max-width="6xl" icon="i-lucide-timer-reset">
    <div class="tool-workspace">
      <div class="space-y-4">
        <ToolSection :title="$t('tools.pomodoro.config')" :description="$t('tools.pomodoro.configDesc')">
          <div class="space-y-5">
            <div class="tool-control-grid">
              <UFormField :label="$t('tools.pomodoro.workMinutes')">
                <UInput :model-value="workMinutes" type="number" :min="1" :max="180" class="w-full" @update:model-value="applyWorkMinutes(Number($event))" />
              </UFormField>
              <UFormField :label="$t('tools.pomodoro.breakMinutes')">
                <UInput :model-value="breakMinutes" type="number" :min="1" :max="60" class="w-full" @update:model-value="applyBreakMinutes(Number($event))" />
              </UFormField>
            </div>
            <UAlert color="primary" variant="soft" icon="i-lucide-info" :description="$t('tools.pomodoro.backgroundNotice')" />
          </div>
        </ToolSection>

        <ResultPanel :title="$t('tools.pomodoro.cyclesTitle')" :value="String(cycleCount)" compact />
      </div>

      <div class="tool-preview-sticky">
        <ToolSection :title="$t('tools.pomodoro.session')" compact>
          <div class="tool-stage p-6 text-center shadow-inner shadow-default/5">
            <div class="flex flex-wrap items-center justify-center gap-2">
              <UBadge :color="phase === 'work' ? 'primary' : 'success'" variant="soft" size="lg" class="rounded-full">
                {{ phase === 'work' ? $t('tools.pomodoro.workPhase') : $t('tools.pomodoro.breakPhase') }}
              </UBadge>
              <UBadge :color="running ? 'primary' : 'neutral'" variant="soft" class="rounded-full">
                {{ sessionStatusText }}
              </UBadge>
            </div>
            <div class="mt-4 text-6xl font-black tracking-widest text-highlighted sm:text-7xl">{{ displayTime }}</div>
            <UProgress class="mt-5" :model-value="progress" :max="100" />
            <div class="mt-5 flex flex-wrap justify-center gap-2">
              <UButton color="primary" class="rounded-full" @click="toggle">
                {{ running ? $t('tools.pomodoro.pause') : $t('tools.pomodoro.start') }}
              </UButton>
              <UButton color="neutral" variant="soft" class="rounded-full" @click="skipPhase">
                {{ $t('tools.pomodoro.skip') }}
              </UButton>
              <UButton color="neutral" variant="ghost" class="rounded-full" @click="resetAll">
                {{ $t('tools.pomodoro.reset') }}
              </UButton>
              <UButton color="neutral" variant="ghost" icon="i-lucide-maximize-2" class="rounded-full" @click="fullscreen = true">
                {{ $t('tools.pomodoro.fullscreen') }}
              </UButton>
            </div>
          </div>
        </ToolSection>
      </div>
    </div>

    <div v-if="fullscreen" class="tool-fullscreen-stage fixed inset-0 z-50 flex flex-col items-center justify-center p-6">
      <UButton color="neutral" variant="ghost" icon="i-lucide-minimize-2" class="absolute right-6 top-6 rounded-full" @click="fullscreen = false">{{ $t('tools.pomodoro.exitFullscreen') }}</UButton>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <UBadge :color="phase === 'work' ? 'primary' : 'success'" variant="soft" size="lg" class="rounded-full">
          {{ phase === 'work' ? $t('tools.pomodoro.workPhase') : $t('tools.pomodoro.breakPhase') }}
        </UBadge>
        <UBadge :color="running ? 'primary' : 'neutral'" variant="soft" size="lg" class="rounded-full">
          {{ sessionStatusText }}
        </UBadge>
      </div>
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
