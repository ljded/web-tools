<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const { t, locale } = useI18n()
const expression = usePersistedRef('web-tools:cron:expression', '*/15 9-18 * * 1-5')

interface ParsedCron {
  parts: string[]
  valid: boolean
  error?: string
}

function parseCron(exp: string): ParsedCron {
  const parts = exp.trim().split(/\s+/)
  if (parts.length !== 5) {
    return { parts, valid: false, error: t('tools.cron.invalidFieldCount') }
  }
  return { parts, valid: true }
}

function matchField(value: number, token: string, min: number, max: number): boolean {
  if (token === '*') return true

  return token.split(',').some((part) => {
    if (/^\*\/\d+$/.test(part)) {
      const step = Number(part.split('/')[1])
      return step > 0 && (value - min) % step === 0
    }

    if (/^\d+-\d+(?:\/\d+)?$/.test(part)) {
      const [range, stepPart] = part.split('/')
      const [startRaw, endRaw] = range!.split('-')
      const start = Number(startRaw)
      const end = Number(endRaw)
      if (Number.isNaN(start) || Number.isNaN(end)) return false
      if (start > end) return false
      if (value < start || value > end) return false
      if (!stepPart) return true
      const step = Number(stepPart)
      return step > 0 && (value - start) % step === 0
    }

    const num = Number(part)
    if (Number.isNaN(num)) return false
    return num >= min && num <= max && value === num
  })
}

function nextRuns(exp: string, limit = 5): string[] {
  const parsed = parseCron(exp)
  if (!parsed.valid) return []
  const [m, h, dom, mon, dow] = parsed.parts

  const runs: string[] = []
  let date = new Date()
  date.setSeconds(0, 0)
  date = new Date(date.getTime() + 60_000)

  for (let i = 0; i < 525_600 && runs.length < limit; i++) {
    if (
      matchField(date.getMinutes(), m!, 0, 59) &&
      matchField(date.getHours(), h!, 0, 23) &&
      matchField(date.getDate(), dom!, 1, 31) &&
      matchField(date.getMonth() + 1, mon!, 1, 12) &&
      matchField(date.getDay(), dow!, 0, 6)
    ) {
      runs.push(date.toLocaleString(locale.value))
    }
    date = new Date(date.getTime() + 60_000)
  }

  return runs
}

const parsed = computed(() => parseCron(expression.value))

const fieldExplain = computed(() => {
  if (!parsed.value.valid) return []
  const [minute, hour, day, month, week] = parsed.value.parts
  return [
    { label: t('tools.cron.fieldLabels.minute'), value: minute },
    { label: t('tools.cron.fieldLabels.hour'), value: hour },
    { label: t('tools.cron.fieldLabels.day'), value: day },
    { label: t('tools.cron.fieldLabels.month'), value: month },
    { label: t('tools.cron.fieldLabels.week'), value: week },
  ]
})

const runs = computed(() => nextRuns(expression.value))
const resultText = computed(() => {
  if (!parsed.value.valid) return ''
  return [
    t('tools.cron.fieldsResultTitle'),
    ...fieldExplain.value.map((item) => `${item.label}: ${item.value}`),
    '',
    t('tools.cron.nextRunsResultTitle'),
    ...runs.value.map((run, index) => `${index + 1}. ${run}`),
  ].join('\n')
})
</script>

<template>
  <ToolPage name="cron" max-width="6xl" icon="i-lucide-calendar-clock">
    <div class="tool-workspace">
      <ToolSection :title="$t('tools.cron.inputTitle')" :description="$t('tools.cron.inputDesc')">
        <div class="space-y-4">
          <UInput v-model="expression" :placeholder="$t('tools.cron.placeholder')" class="w-full font-mono" size="lg" />
          <div class="text-xs text-muted">{{ $t('tools.cron.formatHint') }}</div>
          <UAlert v-if="!parsed.valid" color="error" variant="soft" icon="i-lucide-circle-alert" :description="parsed.error" />
          <ResultPanel v-if="parsed.valid" class="lg:hidden" :title="$t('tools.cron.nextRunsTitle')" :value="resultText" pre-wrap compact />
        </div>
      </ToolSection>

      <div class="hidden lg:block tool-preview-sticky">
        <ResultPanel
          :title="$t('tools.cron.nextRunsTitle')"
          :value="resultText"
          :error="parsed.valid ? '' : parsed.error"
          pre-wrap
        />
      </div>
    </div>
  </ToolPage>
</template>
