<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToolState } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import CopyBtn from '@/components/CopyBtn.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { useRouteQueryValue } from '@/utils/routeQuery'

interface MatchItem {
  text: string
  index: number
  groups: (string | undefined)[]
}

const MAX_REGEX_TEXT_CHARS = 200_000
const MAX_REGEX_RESULTS = 500

const { t } = useI18n()

const pattern = ref('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}')
const flags = ref({ g: true, i: true, m: false, s: false, u: false })
const text = ref(t('tools.regex.sampleText'))
const replaceWith = ref('')
const activeTab = ref<'match' | 'replace' | 'split'>('match')
useRouteQueryValue('tab', activeTab, ['match', 'replace', 'split'])
const matches = ref<MatchItem[]>([])
const replaceResult = ref('')
const splitResult = ref<string[]>([])
const highlightedResult = ref('')
const resultNotice = ref('')

const { history } = useToolState<string, any>({
  storageKey: 'regex',
  defaultInput: '',
  historyOptions: {
    maxCount: 10,
    generateLabel: (d) => `/${d.pattern.slice(0, 20)}${d.pattern.length > 20 ? '...' : ''}/${Object.entries(d.flags).filter(([,v]) => v).map(([k]) => k).join('')}`,
  },
})

function onHistorySelect(item: { data: { pattern: string; flags: any; text: string; replaceWith: string; activeTab: string } }) {
  pattern.value = item.data.pattern
  flags.value = { ...item.data.flags }
  text.value = item.data.text
  replaceWith.value = item.data.replaceWith
  activeTab.value = item.data.activeTab as any
}

function doSaveHistory() {
  if (!pattern.value.trim()) return
  history.add({
    pattern: pattern.value,
    flags: { ...flags.value },
    text: text.value,
    replaceWith: replaceWith.value,
    activeTab: activeTab.value,
  })
}

const flagStr = computed(() =>
  Object.entries(flags.value).filter(([, v]) => v).map(([k]) => k).join(''),
)

const regex = computed(() => {
  try { return new RegExp(pattern.value, flagStr.value) }
  catch { return null }
})

const error = computed(() => {
  try { new RegExp(pattern.value, flagStr.value); return '' }
  catch (e: any) { return e.message }
})

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function updateRegexResult() {
  matches.value = []
  replaceResult.value = ''
  splitResult.value = []
  resultNotice.value = ''

  if (!text.value) { highlightedResult.value = ''; return }
  if (!regex.value) { highlightedResult.value = escapeHtml(text.value.slice(0, MAX_REGEX_TEXT_CHARS)); return }
  if (text.value.length > MAX_REGEX_TEXT_CHARS) {
    highlightedResult.value = escapeHtml(text.value.slice(0, MAX_REGEX_TEXT_CHARS))
    resultNotice.value = t('tools.regex.textTooLong', { max: MAX_REGEX_TEXT_CHARS.toLocaleString() })
    return
  }

  if (activeTab.value === 'replace') {
    replaceResult.value = text.value.replace(regex.value, replaceWith.value)
    return
  }

  if (activeTab.value === 'split') {
    splitResult.value = text.value.split(regex.value).filter((s, i) => i < MAX_REGEX_RESULTS)
    if (splitResult.value.length >= MAX_REGEX_RESULTS) {
      resultNotice.value = t('tools.regex.splitLimit', {
        total: text.value.split(regex.value).length,
        max: MAX_REGEX_RESULTS.toLocaleString(),
      })
    }
    return
  }

  const re = regex.value
  const results: MatchItem[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text.value)) !== null) {
    results.push({ text: m[0], index: m.index, groups: m.slice(1) })
    if (results.length >= MAX_REGEX_RESULTS) {
      resultNotice.value = t('tools.regex.matchLimit', { max: MAX_REGEX_RESULTS.toLocaleString() })
      break
    }
    if (!re.global) break
  }
  matches.value = results

  if (results.length) {
    let html = ''
    let lastIdx = 0
    for (const r of results) {
      html += escapeHtml(text.value.slice(lastIdx, r.index))
      html += `<mark class="rounded bg-warning/20 text-highlighted">${escapeHtml(r.text)}</mark>`
      lastIdx = r.index + r.text.length
    }
    html += escapeHtml(text.value.slice(lastIdx))
    highlightedResult.value = html
  } else {
    highlightedResult.value = escapeHtml(text.value)
  }
}

let computeTimer: ReturnType<typeof setTimeout> | null = null
watch([pattern, flagStr, text, replaceWith, activeTab], () => {
  if (computeTimer) clearTimeout(computeTimer)
  computeTimer = setTimeout(updateRegexResult, 200)
}, { immediate: true })

const presets = computed(() => [
  { label: t('tools.regex.presets.email'), value: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
  { label: t('tools.regex.presets.phone'), value: '1[3-9]\\d{9}' },
  { label: t('tools.regex.presets.url'), value: 'https?://[\\w.-]+(?::\\d+)?(?:/[\\w./?%&=-]*)?' },
  { label: t('tools.regex.presets.ipv4'), value: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}' },
  { label: t('tools.regex.presets.idcard'), value: '\\d{17}[\\dXx]' },
  { label: t('tools.regex.presets.date'), value: '\\d{4}-\\d{2}-\\d{2}' },
  { label: t('tools.regex.presets.chinese'), value: '[\\u4e00-\\u9fa5]+' },
  { label: t('tools.regex.presets.uuid'), value: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' },
])

function setPreset(value: string) {
  pattern.value = value
}

const regexLiteral = computed(() => `/${pattern.value}/${flagStr.value}`)
const matchText = computed(() => matches.value.map(m => m.text).join('\n'))
const splitText = computed(() => splitResult.value.join('\n---\n'))
const resultTitle = computed(() => {
  if (activeTab.value === 'match') return t('tools.regex.highlightedResult', { count: matches.value.length })
  if (activeTab.value === 'replace') return t('tools.regex.replaceResult')
  return t('tools.regex.splitResult', { count: splitResult.value.length })
})
const tabItems = computed(() => [
  { label: t('tools.regex.match'), value: 'match', icon: 'i-lucide-search' },
  { label: t('tools.regex.replace'), value: 'replace', icon: 'i-lucide-replace' },
  { label: t('tools.regex.split'), value: 'split', icon: 'i-lucide-scissors' },
])
</script>

<template>
  <ToolPage name="regex" max-width="6xl" icon="i-lucide-search-code">
    <div class="tool-workspace">
      <ToolSection :title="$t('tools.regex.expressionTitle')" :description="$t('tools.regex.expressionDesc')">
        <template #actions>
          <HistoryPanel
            :items="history.items.value"
            @select="onHistorySelect"
            @remove="history.remove"
            @clear="history.clear"
          />
        </template>

        <div class="space-y-5">
          <div class="space-y-2">
            <div class="text-xs font-semibold uppercase tracking-wider text-muted">{{ $t('tools.regex.presetsTitle') }}</div>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="p in presets"
                :key="p.label"
                color="neutral"
                variant="soft"
                size="xs"
                class="rounded-full"
                @click="setPreset(p.value)"
              >
                {{ p.label }}
              </UButton>
            </div>
          </div>

          <div class="hig-subtle-surface rounded-2xl border p-3">
            <div class="flex flex-wrap items-center gap-3">
              <span class="font-mono text-default">/</span>
              <UInput v-model="pattern" @blur="doSaveHistory" :placeholder="$t('tools.regex.patternPlaceholder')" class="min-w-56 flex-1 font-mono" />
              <span class="font-mono text-default">/</span>
              <div class="flex flex-wrap gap-2">
                <UCheckbox
                  v-for="(_, key) in flags"
                  :key="key"
                  v-model="flags[key as keyof typeof flags]"
                  :label="key"
                />
              </div>
            </div>
            <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span class="font-mono">{{ regexLiteral }}</span>
              <CopyBtn :text="regexLiteral" variant="button" compact />
            </div>
          </div>

          <UAlert v-if="error" color="error" variant="soft" icon="i-lucide-circle-alert" :description="$t('tools.regex.errorWithMessage', { message: error })" />

          <UTabs
            v-model="activeTab"
            :items="tabItems"
            color="warning"
          />

          <UTextarea
            v-model="text"
            :placeholder="$t('tools.regex.textPlaceholder')"
            :rows="9"
            class="w-full"
          />

          <UFormField v-if="activeTab === 'replace'" :label="$t('tools.regex.replaceTo')">
            <UInput v-model="replaceWith" :placeholder="$t('tools.regex.replacePlaceholder')" class="w-full font-mono" />
          </UFormField>
        </div>

        <div class="mt-4 lg:hidden">
          <ResultPanel :title="resultTitle" :value="activeTab === 'match' ? matchText : activeTab === 'replace' ? replaceResult : splitText" :copyable="activeTab !== 'match'" :monospace="activeTab !== 'match'" pre-wrap compact>
            <div v-if="activeTab === 'match'" class="break-all rounded-xl bg-elevated p-4 text-sm whitespace-pre-wrap" v-html="highlightedResult || $t('app.waitingForInput')" />
            <template #actions>
              <CopyBtn v-if="activeTab === 'match'" :text="matchText" variant="button" />
            </template>
          </ResultPanel>
        </div>
      </ToolSection>

      <div class="hidden space-y-3 lg:block tool-preview-sticky">
        <ResultPanel :title="resultTitle" :value="activeTab === 'match' ? matchText : activeTab === 'replace' ? replaceResult : splitText" :copyable="activeTab !== 'match'" :monospace="activeTab !== 'match'" pre-wrap max-height="520px">
          <div v-if="activeTab === 'match'" class="break-all rounded-xl bg-elevated p-4 text-sm whitespace-pre-wrap" v-html="highlightedResult || $t('app.waitingForInput')" />
          <template #actions>
            <CopyBtn v-if="activeTab === 'match'" :text="matchText" variant="button" />
          </template>
        </ResultPanel>
        <UAlert v-if="resultNotice" color="neutral" variant="soft" icon="i-lucide-info" :description="resultNotice" />
        <div v-if="activeTab === 'match' && matches.length" class="hig-subtle-surface rounded-[1.75rem] border p-4">
          <div class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{{ $t('tools.regex.captureGroups') }}</div>
          <div class="max-h-56 space-y-2 overflow-auto pr-1">
            <div v-for="match in matches.slice(0, 12)" :key="`${match.index}-${match.text}`" class="tool-list-item p-3 text-xs">
              <div class="font-mono text-default">#{{ match.index }} {{ match.text }}</div>
              <div v-if="match.groups.length" class="mt-2 flex flex-wrap gap-1">
                <UBadge v-for="(group, index) in match.groups" :key="index" color="neutral" variant="soft" size="xs" class="rounded-full">
                  ${{ index + 1 }}: {{ group ?? $t('tools.regex.emptyGroup') }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
