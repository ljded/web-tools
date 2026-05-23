<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToolState } from '@/composables'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolHeader from '@/components/ToolHeader.vue'
import ToolCard from '@/components/ToolCard.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'
import CopyBtn from '@/components/CopyBtn.vue'
import ResultPanel from '@/components/ResultPanel.vue'

interface MatchItem {
  text: string
  index: number
  groups: (string | undefined)[]
}

const MAX_REGEX_TEXT_CHARS = 200_000
const MAX_REGEX_RESULTS = 500

const pattern = ref('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}')
const flags = ref({ g: true, i: true, m: false, s: false, u: false })
const text = ref(`contact@example.com\nsupport@company.org\ninvalid-email\nuser.name+tag@domain.co.uk`)
const replaceWith = ref('')
const activeTab = ref<'match' | 'replace' | 'split'>('match')
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
    resultNotice.value = `文本过长，仅展示前 ${MAX_REGEX_TEXT_CHARS.toLocaleString()} 字符，已暂停完整正则计算。`
    return
  }

  if (activeTab.value === 'replace') {
    replaceResult.value = text.value.replace(regex.value, replaceWith.value)
    return
  }

  if (activeTab.value === 'split') {
    splitResult.value = text.value.split(regex.value).filter((s, i) => i < MAX_REGEX_RESULTS)
    if (splitResult.value.length >= MAX_REGEX_RESULTS) {
      resultNotice.value = `分割结果共 ${text.value.split(regex.value).length} 项，仅展示前 ${MAX_REGEX_RESULTS.toLocaleString()} 项。`
    }
    return
  }

  const re = regex.value
  const results: MatchItem[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text.value)) !== null) {
    results.push({ text: m[0], index: m.index, groups: m.slice(1) })
    if (results.length >= MAX_REGEX_RESULTS) {
      resultNotice.value = `匹配结果超过 ${MAX_REGEX_RESULTS.toLocaleString()} 项，已停止继续扫描以保持页面流畅。`
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

const presets = [
  { label: '邮箱', value: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
  { label: '手机号(中国大陆)', value: '1[3-9]\\d{9}' },
  { label: 'URL', value: 'https?://[\\w.-]+(?::\\d+)?(?:/[\\w./?%&=-]*)?' },
  { label: 'IP 地址(IPv4)', value: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}' },
  { label: '身份证号', value: '\\d{17}[\\dXx]' },
  { label: '日期(YYYY-MM-DD)', value: '\\d{4}-\\d{2}-\\d{2}' },
  { label: '中文字符', value: '[\\u4e00-\\u9fa5]+' },
  { label: 'UUID', value: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' },
]

function setPreset(value: string) {
  pattern.value = value
}
</script>

<template>
  <ToolLayout max-width="4xl">
    <ToolHeader title="正则工具" description="正则匹配、替换、分割和结果高亮" icon="i-lucide-search-code" />

    <ToolCard title="表达式与文本" description="选择预设或输入正则表达式，支持 flags 和历史记录。">
      <template #actions>
        <HistoryPanel
          :items="history.items.value"
          @select="onHistorySelect"
          @remove="history.remove"
          @clear="history.clear"
        />
      </template>
      <div class="space-y-4">
        <!-- 预设区域 -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium text-muted">预设:</span>
          <UBadge
            v-for="p in presets"
            :key="p.label"
            color="neutral"
            variant="subtle"
            class="cursor-pointer rounded-full px-3 py-1 text-xs transition-colors hover:bg-primary/10"
            @click="setPreset(p.value)"
          >
            {{ p.label }}
          </UBadge>
        </div>

        <!-- 正则输入 -->
        <div class="flex flex-wrap items-center gap-3">
          <span class="font-mono text-default">/</span>
          <UInput v-model="pattern" @blur="doSaveHistory" placeholder="正则表达式" class="flex-1 font-mono" />
          <span class="font-mono text-default">/</span>
          <div class="flex gap-2">
            <UCheckbox
              v-for="(_, key) in flags"
              :key="key"
              v-model="flags[key as keyof typeof flags]"
              :label="key"
            />
          </div>
        </div>

        <UAlert v-if="error" color="error" variant="soft" icon="i-lucide-circle-alert" :description="`错误: ${error}`" />

        <!-- 操作标签页 -->
        <UTabs
          v-model="activeTab"
          :items="[
            { label: '匹配', value: 'match', icon: 'i-lucide-search' },
            { label: '替换', value: 'replace', icon: 'i-lucide-replace' },
            { label: '分割', value: 'split', icon: 'i-lucide-scissors' }
          ]"
          color="warning"
        />

        <UTextarea
          v-model="text"
          placeholder="输入要匹配的文本..."
          :rows="8"
          class="w-full"
        />
      </div>

      <!-- 替换输入框 -->
      <UFormField v-if="activeTab === 'replace'" label="替换为" class="mt-3">
        <UInput v-model="replaceWith" placeholder="替换内容..." class="w-full font-mono" />
      </UFormField>
    </ToolCard>

    <!-- 结果区域 -->
    <ResultPanel v-if="activeTab === 'match'" :title="`高亮结果 (${matches.length} 项匹配)`" :value="matches.map(m => m.text).join('\n')" :copyable="false" :monospace="false" pre-wrap>
      <div class="break-all rounded-xl bg-elevated p-4 text-sm whitespace-pre-wrap" v-html="highlightedResult || '等待输入...'" />
      <template #actions>
        <CopyBtn :text="matches.map(m => m.text).join('\n')" variant="button" />
      </template>
      <UAlert v-if="resultNotice" class="mt-3" color="neutral" variant="soft" icon="i-lucide-info" :description="resultNotice" />
    </ResultPanel>

    <ResultPanel v-if="activeTab === 'replace'" title="替换结果" :value="replaceResult" pre-wrap />

    <ResultPanel v-if="activeTab === 'split'" :title="`分割结果 (${splitResult.length} 项)`" :value="splitResult.join('\n---\n')" :copyable="false" :monospace="false">
      <template #actions>
        <CopyBtn :text="splitResult.join('\n---\n')" variant="button" />
      </template>
      <UAlert v-if="resultNotice" class="mb-3" color="neutral" variant="soft" icon="i-lucide-info" :description="resultNotice" />
      <div class="space-y-2">
        <div v-for="(s, i) in splitResult" :key="i" class="rounded-xl bg-elevated p-3 font-mono text-sm text-default">{{ s || '(空)' }}</div>
      </div>
    </ResultPanel>
  </ToolLayout>
</template>
