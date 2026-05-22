<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Lightbulb } from '@lucide/vue'
import { useToolState } from '@/composables'
import ToolLayout from '@/components/ToolLayout.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'
import CopyBtn from '@/components/CopyBtn.vue'

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

  // match mode
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

  // highlight
  if (results.length) {
    let html = ''
    let lastIdx = 0
    for (const r of results) {
      html += escapeHtml(text.value.slice(lastIdx, r.index))
      html += `<mark class="bg-yellow-200 dark:bg-yellow-800 rounded">${escapeHtml(r.text)}</mark>`
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

const highlightedPattern = computed(() => {
  try {
    new RegExp(pattern.value)
    return escapeHtml(pattern.value)
  } catch {
    return `<span class="text-error">${escapeHtml(pattern.value)}</span>`
  }
})

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
    <UCard class="rounded-3xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="space-y-4">
        <!-- 预设区域 -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium text-on-surface-variant">预设:</span>
          <UBadge
            v-for="p in presets"
            :key="p.label"
            color="neutral"
            variant="subtle"
            class="cursor-pointer rounded-full px-3 py-1 text-xs transition-colors hover:bg-primary-container"
            @click="setPreset(p.value)"
          >
            {{ p.label }}
          </UBadge>
        </div>

        <!-- 正则输入 -->
        <div class="flex flex-wrap items-center gap-3">
          <span class="font-mono text-on-surface">/</span>
          <UInput
            v-model="pattern"
            @blur="doSaveHistory"
            placeholder="正则表达式"
            class="h-10 flex-1 font-mono"
          />
          <span class="font-mono text-on-surface">/</span>
          <div class="flex gap-2">
            <UCheckbox
              v-for="(_, key) in flags"
              :key="key"
              v-model="flags[key as keyof typeof flags]"
              :label="key"
            />
          </div>
        </div>
        <div v-if="pattern" class="rounded bg-surface-variant/50 px-3 py-1.5">
          <span class="mr-2 text-xs text-on-surface-variant">语法预览:</span>
          <code class="font-mono text-xs" v-html="highlightedPattern" />
        </div>
        <div v-if="error" class="text-xs text-error">{{ error }}</div>

        <!-- 标签切换 -->
        <div class="flex items-center justify-between border-b border-outline-variant pb-2">
          <div class="flex gap-2">
            <UButton
              v-for="t in ['match', 'replace', 'split'] as const"
              :key="t"
              variant="ghost"
              color="neutral"
              @click="activeTab = t"
              class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              :class="activeTab === t ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant'"
            >
              {{ t === 'match' ? '匹配' : t === 'replace' ? '替换' : '分割' }}
            </UButton>
          </div>
          <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
        </div>

        <!-- 文本输入 -->
        <UTextarea
          v-model="text"
          @blur="doSaveHistory"
          placeholder="输入测试文本..."
          :rows="10"
          class="resize-none rounded-xl border border-outline bg-surface p-3 text-sm w-full"
        />

        <!-- 替换模式额外输入 -->
        <div v-if="activeTab === 'replace'" class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-sm text-on-surface-variant">替换为:</span>
            <UInput v-model="replaceWith" placeholder="替换内容" class="h-10 flex-1 font-mono" />
          </div>
          <div class="flex items-center gap-1 text-xs text-on-surface-variant">
            <Lightbulb class="h-3 w-3" />
            支持 <code class="rounded bg-surface-variant px-1">$&amp;</code> 匹配项, <code class="rounded bg-surface-variant px-1">$1</code> <code class="rounded bg-surface-variant px-1">$2</code> 捕获组, <code class="rounded bg-surface-variant px-1">$`</code> 匹配前, <code class="rounded bg-surface-variant px-1">$'</code> 匹配后
          </div>
        </div>

        <!-- 结果 -->
        <div v-if="resultNotice" class="text-xs text-on-surface-variant">{{ resultNotice }}</div>

        <div v-if="activeTab === 'match' && text">
          <pre class="whitespace-pre-wrap text-sm text-on-surface" v-html="highlightedResult" />
          <div v-if="matches.length" class="mt-4 space-y-2">
            <div v-for="(m, i) in matches" :key="i" class="rounded-xl bg-surface-variant/50 p-3 text-sm">
              <div class="flex items-center justify-between">
                <span class="font-medium text-on-surface">匹配 #{{ i + 1 }}</span>
                <span class="text-xs text-on-surface-variant">位置 {{ m.index }}</span>
              </div>
              <code class="mt-1 block font-mono text-primary">{{ m.text }}</code>
              <div v-if="m.groups.filter(Boolean).length" class="mt-2 space-y-1">
                <div v-for="(g, gi) in m.groups" :key="gi">
                  <span v-if="g !== undefined" class="text-xs text-on-surface-variant">\${{ gi + 1 }}: <code class="rounded bg-surface px-1 font-mono text-xs">{{ g }}</code></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'replace'">
          <pre class="whitespace-pre-wrap text-sm text-on-surface">{{ replaceResult }}</pre>
          <CopyBtn v-if="replaceResult" :text="replaceResult" variant="button" class="mt-2" />
        </div>

        <div v-if="activeTab === 'split' && splitResult.length" class="space-y-2">
          <div v-for="(s, i) in splitResult" :key="i" class="rounded-xl bg-surface-variant/50 p-3 font-mono text-sm text-on-surface">
            [{{ i }}] {{ s }}
          </div>
        </div>
      </div>
    </UCard>
  </ToolLayout>
</template>
