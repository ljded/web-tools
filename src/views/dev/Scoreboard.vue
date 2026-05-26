<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyBtn from '@/components/CopyBtn.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const leftName = usePersistedRef('web-tools:scoreboard:left-name', 'Team A')
const rightName = usePersistedRef('web-tools:scoreboard:right-name', 'Team B')
const leftScore = usePersistedRef('web-tools:scoreboard:left-score', 0)
const rightScore = usePersistedRef('web-tools:scoreboard:right-score', 0)
const step = usePersistedRef('web-tools:scoreboard:step', 1)
const stepOptionsText = usePersistedRef('web-tools:scoreboard:step-options', '1,2,3,5,10')
const fullscreen = ref(false)

const scoreText = computed(() => `${leftName.value} ${leftScore.value} : ${rightScore.value} ${rightName.value}`)
const stepOptions = computed(() => {
  const values = stepOptionsText.value
    .split(/[,，\s]+/)
    .map((item) => clampStep(Number(item)))
    .filter((item, index, arr) => item > 0 && arr.indexOf(item) === index)
  return values.length ? values : [step.value]
})

function clampStep(value: number) {
  return Math.min(Math.max(Number(value) || 1, 1), 100)
}

function updateStep(value: number) {
  step.value = clampStep(value)
}

function addLeft(delta: number) {
  leftScore.value = Math.max(0, leftScore.value + delta)
}

function addRight(delta: number) {
  rightScore.value = Math.max(0, rightScore.value + delta)
}

function resetScores() {
  leftScore.value = 0
  rightScore.value = 0
}

function swapSides() {
  const ln = leftName.value
  const ls = leftScore.value
  leftName.value = rightName.value
  leftScore.value = rightScore.value
  rightName.value = ln
  rightScore.value = ls
}
</script>

<template>
  <ToolPage name="scoreboard" max-width="6xl" icon="i-lucide-trophy">
    <div class="tool-workspace">
      <div class="space-y-4">
        <ToolSection :title="$t('tools.scoreboard.config')" :description="$t('tools.scoreboard.configDesc')">
          <div class="space-y-5">
            <div class="tool-control-grid">
              <UFormField :label="$t('tools.scoreboard.leftName')">
                <UInput v-model="leftName" :placeholder="$t('tools.scoreboard.leftNamePlaceholder')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('tools.scoreboard.rightName')">
                <UInput v-model="rightName" :placeholder="$t('tools.scoreboard.rightNamePlaceholder')" class="w-full" />
              </UFormField>
            </div>

            <div class="tool-control-grid">
              <UFormField :label="$t('tools.scoreboard.step')">
                <UInput :model-value="step" type="number" :min="1" :max="100" class="w-full" @update:model-value="updateStep(Number($event))" />
              </UFormField>
              <UFormField :label="$t('tools.scoreboard.stepOptions')">
                <UInput v-model="stepOptionsText" :placeholder="$t('tools.scoreboard.stepOptionsPlaceholder')" class="w-full" />
              </UFormField>
            </div>

            <div class="tool-command-bar justify-between">
              <div class="truncate font-mono text-sm text-default">{{ scoreText }}</div>
              <div class="flex flex-wrap gap-2">
                <CopyBtn :text="scoreText" />
                <UButton color="neutral" variant="ghost" icon="i-lucide-maximize-2" class="rounded-full" @click="fullscreen = true">
                  {{ $t('tools.scoreboard.fullscreen') }}
                </UButton>
                <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" class="rounded-full" @click="resetScores">
                  {{ $t('tools.scoreboard.reset') }}
                </UButton>
                <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left-right" class="rounded-full" @click="swapSides">
                  {{ $t('tools.scoreboard.swap') }}
                </UButton>
              </div>
            </div>
          </div>
        </ToolSection>
      </div>

      <div class="tool-preview-sticky">
        <ToolSection :title="$t('tools.scoreboard.liveBoard')" compact>
          <div class="grid grid-cols-1 gap-4">
            <div class="tool-metric-card">
              <div class="text-sm text-muted">{{ leftName }}</div>
              <div class="mt-2 text-6xl font-black text-highlighted">{{ leftScore }}</div>
              <div class="mt-4 flex flex-wrap gap-2">
                <template v-for="option in stepOptions" :key="`left-${option}`">
                  <UButton color="success" variant="soft" class="rounded-full" @click="addLeft(option)">+{{ option }}</UButton>
                  <UButton color="error" variant="soft" class="rounded-full" @click="addLeft(-option)">-{{ option }}</UButton>
                </template>
              </div>
            </div>

            <div class="tool-metric-card">
              <div class="text-sm text-muted">{{ rightName }}</div>
              <div class="mt-2 text-6xl font-black text-highlighted">{{ rightScore }}</div>
              <div class="mt-4 flex flex-wrap gap-2">
                <template v-for="option in stepOptions" :key="`right-${option}`">
                  <UButton color="success" variant="soft" class="rounded-full" @click="addRight(option)">+{{ option }}</UButton>
                  <UButton color="error" variant="soft" class="rounded-full" @click="addRight(-option)">-{{ option }}</UButton>
                </template>
              </div>
            </div>
          </div>
        </ToolSection>
      </div>
    </div>

    <div v-if="fullscreen" class="tool-fullscreen-stage fixed inset-0 z-50 flex flex-col p-6">
      <div class="mb-4 flex items-center justify-between">
        <div class="text-sm font-semibold text-muted">{{ $t('tools.scoreboard.liveBoard') }}</div>
        <UButton color="neutral" variant="ghost" icon="i-lucide-minimize-2" class="rounded-full" @click="fullscreen = false">{{ $t('tools.scoreboard.exitFullscreen') }}</UButton>
      </div>
      <div class="grid flex-1 grid-cols-2 gap-6">
        <div class="flex flex-col items-center justify-center tool-stage p-6">
          <div class="text-3xl font-semibold text-muted">{{ leftName }}</div>
          <div class="mt-8 text-[18vw] font-black leading-none text-highlighted">{{ leftScore }}</div>
        </div>
        <div class="flex flex-col items-center justify-center tool-stage p-6">
          <div class="text-3xl font-semibold text-muted">{{ rightName }}</div>
          <div class="mt-8 text-[18vw] font-black leading-none text-highlighted">{{ rightScore }}</div>
        </div>
      </div>
      <div class="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div class="flex flex-wrap justify-center gap-2 lg:justify-end">
          <template v-for="option in stepOptions" :key="`full-left-${option}`">
            <UButton color="success" size="xl" class="rounded-full" @click="addLeft(option)">{{ leftName }} +{{ option }}</UButton>
            <UButton color="error" variant="soft" size="xl" class="rounded-full" @click="addLeft(-option)">{{ leftName }} -{{ option }}</UButton>
          </template>
        </div>
        <UButton color="neutral" variant="soft" size="xl" class="rounded-full" @click="resetScores">{{ $t('tools.scoreboard.reset') }}</UButton>
        <div class="flex flex-wrap justify-center gap-2 lg:justify-start">
          <template v-for="option in stepOptions" :key="`full-right-${option}`">
            <UButton color="success" size="xl" class="rounded-full" @click="addRight(option)">{{ rightName }} +{{ option }}</UButton>
            <UButton color="error" variant="soft" size="xl" class="rounded-full" @click="addRight(-option)">{{ rightName }} -{{ option }}</UButton>
          </template>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
