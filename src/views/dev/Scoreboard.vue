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
  <ToolPage name="scoreboard" max-width="4xl" icon="i-lucide-trophy">
    <ToolSection :title="$t('tools.scoreboard.config')">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UFormField :label="$t('tools.scoreboard.leftName')">
          <UInput v-model="leftName" :placeholder="$t('tools.scoreboard.leftNamePlaceholder')" />
        </UFormField>
        <UFormField :label="$t('tools.scoreboard.rightName')">
          <UInput v-model="rightName" :placeholder="$t('tools.scoreboard.rightNamePlaceholder')" />
        </UFormField>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <UFormField :label="$t('tools.scoreboard.step')" class="w-36">
          <UInput :model-value="step" type="number" :min="1" :max="100" @update:model-value="updateStep(Number($event))" />
        </UFormField>
        <UFormField label="分值选项" class="min-w-52 flex-1">
          <UInput v-model="stepOptionsText" placeholder="如 1,2,3,5,10" />
        </UFormField>
        <UButton color="neutral" variant="ghost" icon="i-lucide-maximize-2" class="rounded-full" @click="fullscreen = true">
          全屏
        </UButton>
        <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" class="rounded-full" @click="resetScores">
          {{ $t('tools.scoreboard.reset') }}
        </UButton>
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left-right" class="rounded-full" @click="swapSides">
          {{ $t('tools.scoreboard.swap') }}
        </UButton>
      </div>
    </ToolSection>

    <ToolSection :title="$t('tools.scoreboard.liveBoard')" compact>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-2xl border border-default/70 bg-elevated/70 p-4">
          <div class="text-sm text-muted">{{ leftName }}</div>
          <div class="mt-2 text-4xl font-semibold text-highlighted">{{ leftScore }}</div>
          <div class="mt-4 flex flex-wrap gap-2">
            <template v-for="option in stepOptions" :key="option">
              <UButton color="success" variant="soft" class="rounded-full" @click="addLeft(option)">+{{ option }}</UButton>
              <UButton color="error" variant="soft" class="rounded-full" @click="addLeft(-option)">-{{ option }}</UButton>
            </template>
          </div>
        </div>

        <div class="rounded-2xl border border-default/70 bg-elevated/70 p-4">
          <div class="text-sm text-muted">{{ rightName }}</div>
          <div class="mt-2 text-4xl font-semibold text-highlighted">{{ rightScore }}</div>
          <div class="mt-4 flex flex-wrap gap-2">
            <template v-for="option in stepOptions" :key="option">
              <UButton color="success" variant="soft" class="rounded-full" @click="addRight(option)">+{{ option }}</UButton>
              <UButton color="error" variant="soft" class="rounded-full" @click="addRight(-option)">-{{ option }}</UButton>
            </template>
          </div>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between rounded-2xl border border-default/70 bg-elevated/70 px-4 py-3">
        <span class="font-mono text-sm text-default">{{ scoreText }}</span>
        <CopyBtn :text="scoreText" />
      </div>
    </ToolSection>

    <div v-if="fullscreen" class="fixed inset-0 z-50 flex flex-col bg-default p-6">
      <div class="mb-4 flex items-center justify-between">
        <div class="text-sm font-semibold text-muted">{{ $t('tools.scoreboard.liveBoard') }}</div>
        <UButton color="neutral" variant="ghost" icon="i-lucide-minimize-2" class="rounded-full" @click="fullscreen = false">退出全屏</UButton>
      </div>
      <div class="grid flex-1 grid-cols-2 gap-6">
        <div class="flex flex-col items-center justify-center rounded-[2rem] border border-default bg-elevated p-6">
          <div class="text-3xl font-semibold text-muted">{{ leftName }}</div>
          <div class="mt-8 text-[18vw] font-black leading-none text-highlighted">{{ leftScore }}</div>
        </div>
        <div class="flex flex-col items-center justify-center rounded-[2rem] border border-default bg-elevated p-6">
          <div class="text-3xl font-semibold text-muted">{{ rightName }}</div>
          <div class="mt-8 text-[18vw] font-black leading-none text-highlighted">{{ rightScore }}</div>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <template v-for="option in stepOptions" :key="`full-${option}`">
          <UButton color="success" size="xl" class="rounded-full" @click="addLeft(option)">{{ leftName }} +{{ option }}</UButton>
          <UButton color="success" size="xl" class="rounded-full" @click="addRight(option)">{{ rightName }} +{{ option }}</UButton>
        </template>
        <UButton color="neutral" variant="soft" size="xl" class="rounded-full" @click="resetScores">{{ $t('tools.scoreboard.reset') }}</UButton>
      </div>
    </div>
  </ToolPage>
</template>
