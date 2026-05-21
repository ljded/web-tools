<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Copy, Check, Lightbulb } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'
import { usePersistedRef } from '@/utils/persist'
import { useHistory } from '@/utils/history'
import HistoryPanel from '@/components/HistoryPanel.vue'

const pattern = usePersistedRef('web-tools:regex:pattern', '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}')
const flags = usePersistedRef('web-tools:regex:flags', { g: true, i: true, m: false, s: false, u: false })
const text = usePersistedRef('web-tools:regex:text', `contact@example.com\nsupport@company.org\ninvalid-email\nuser.name+tag@domain.co.uk`)
const replaceWith = usePersistedRef('web-tools:regex:replace', '')
const activeTab = usePersistedRef<'match' | 'replace' | 'split'>('web-tools:regex:tab', 'match')
const matches = ref<MatchItem[]>([])

const regexHistory = useHistory<{
  pattern: string
  flags: { g: boolean; i: boolean; m: boolean; s: boolean; u: boolean }
  text: string
  replaceWith: string
  activeTab: 'match' | 'replace' | 'split'
}>('web-tools:regex:history', {
  maxCount: 10,
  generateLabel: (d) => `/${d.pattern.slice(0, 20)}${d.pattern.length > 20 ? '...' : ''}/${Object.entries(d.flags).filter(([,v])=>v).map(([k])=>k).join('')}`,
})

function saveHistory() {
  if (!pattern.value.trim()) return
  regexHistory.add({
    pattern: pattern.value,
    flags: { ...flags.value },
    text: text.value,
    replaceWith: replaceWith.value,
    activeTab: activeTab.value,
  })
}

function onHistorySelect(item: { data: { pattern: string; flags: { g: boolean; i: boolean; m: boolean; s: boolean; u: boolean }; text: string; replaceWith: string; activeTab: 'match' | 'replace' | 'split' } }) {
  pattern.value = item.data.pattern
  flags.value = { ...item.data.flags }
  text.value = item.data.text
  replaceWith.value = item.data.replaceWith
  activeTab.value = item.data.activeTab
}
const replaceResult = ref('')
const splitResult = ref<string[]>([])
const highlightedResult = ref('')
const resultNotice = ref('')

const MAX_REGEX_TEXT_CHARS = 200_000
const MAX_REGEX_RESULTS = 500

const flagStr = computed(() => {
  return Object.entries(flags.value)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join('')
})

const regex = computed(() => {
  try {
    return new RegExp(pattern.value, flagStr.value)
  } catch {
    return null
  }
})

const error = computed(() => {
  try {
    new RegExp(pattern.value, flagStr.value)
    return ''
  } catch (e: any) {
    return e.message
  }
})

interface MatchItem {
  text: string
  index: number
  groups: (string | undefined)[]
}

function updateRegexResult() {
  matches.value = []
  replaceResult.value = ''
  splitResult.value = []
  resultNotice.value = ''

  if (!text.value) {
    highlightedResult.value = ''
    return
  }
  if (!regex.value) {
    highlightedResult.value = escapeHtml(text.value.slice(0, MAX_REGEX_TEXT_CHARS))
    return
  }
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
    const parts = text.value.split(regex.value)
    splitResult.value = parts.slice(0, MAX_REGEX_RESULTS)
    if (parts.length > MAX_REGEX_RESULTS) {
      resultNotice.value = `分割结果共 ${parts.length} 项，仅展示前 ${MAX_REGEX_RESULTS} 项。`
    }
    return
  }

  const arr: MatchItem[] = []
  let m: RegExpExecArray | null
  const r = regex.value
  if (flags.value.g) {
    while ((m = r.exec(text.value)) !== null) {
      if (m.index === r.lastIndex) r.lastIndex++
      arr.push({ text: m[0], index: m.index, groups: m.slice(1) })
      if (arr.length >= MAX_REGEX_RESULTS) {
        resultNotice.value = `匹配结果超过 ${MAX_REGEX_RESULTS} 项，已停止继续扫描以保持页面流畅。`
        break
      }
    }
  } else {
    m = r.exec(text.value)
    if (m) arr.push({ text: m[0], index: m.index, groups: m.slice(1) })
  }
  matches.value = arr
  highlightedResult.value = buildHighlightedText(arr)
}

function buildHighlightedText(currentMatches: MatchItem[]): string {
  if (!text.value || activeTab.value !== 'match' || !regex.value || currentMatches.length === 0) {
    return escapeHtml(text.value)
  }
  let result = ''
  let last = 0
  for (const match of currentMatches) {
    result += escapeHtml(text.value.slice(last, match.index))
    let title = `index: ${match.index}`
    if (match.groups.length) {
      title +=
        '\\n捕获组: ' + match.groups.map((g, i) => `$${i + 1}=${JSON.stringify(g)}`).join(', ')
    }
    result += `<mark class="rounded bg-primary-container px-0.5 text-on-primary-container" title="${title}">${escapeHtml(match.text)}</mark>`
    last = match.index + match.text.length
  }
  result += escapeHtml(text.value.slice(last))
  return result
}

let regexTimer: ReturnType<typeof setTimeout> | null = null
watch(
  [pattern, flagStr, text, replaceWith, activeTab],
  () => {
    if (regexTimer) clearTimeout(regexTimer)
    regexTimer = setTimeout(updateRegexResult, 180)
  },
  { immediate: true },
)

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const copiedMap = ref<Record<string, boolean>>({})
async function copy(val: string, key: string) {
  const ok = await copyToClipboard(val)
  if (!ok) return
  copiedMap.value[key] = true
  setTimeout(() => delete copiedMap.value[key], 1500)
}

const presets = [
  {
    name: '邮箱',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    flags: { g: true, i: true, m: false, s: false, u: false },
  },
  {
    name: '手机号(中国大陆)',
    pattern: '1[3-9]\\d{9}',
    flags: { g: true, i: false, m: false, s: false, u: false },
  },
  {
    name: 'URL',
    pattern: 'https?://[^\\s]+',
    flags: { g: true, i: true, m: false, s: false, u: false },
  },
  {
    name: 'IP 地址(IPv4)',
    pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
    flags: { g: true, i: false, m: false, s: false, u: false },
  },
  {
    name: '身份证号',
    pattern: '\\d{17}[\\dXx]|\\d{15}',
    flags: { g: true, i: false, m: false, s: false, u: false },
  },
  {
    name: '日期(YYYY-MM-DD)',
    pattern: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])',
    flags: { g: true, i: false, m: false, s: false, u: false },
  },
  {
    name: '中文字符',
    pattern: '[\\u4e00-\\u9fa5]+',
    flags: { g: true, i: false, m: false, s: false, u: false },
  },
  {
    name: 'UUID',
    pattern:
      '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}',
    flags: { g: true, i: false, m: false, s: false, u: false },
  },
  {
    name: 'MAC 地址',
    pattern: '([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})',
    flags: { g: true, i: false, m: false, s: false, u: false },
  },
  {
    name: 'Hex 颜色',
    pattern: '#(?:[0-9a-fA-F]{3}){1,2}',
    flags: { g: true, i: false, m: false, s: false, u: false },
  },
  {
    name: 'QQ 号',
    pattern: '[1-9]\\d{4,10}',
    flags: { g: true, i: false, m: false, s: false, u: false },
  },
  {
    name: '正整数',
    pattern: '^[1-9]\\d*$',
    flags: { g: false, i: false, m: false, s: false, u: false },
  },
  {
    name: 'HTML 标签',
    pattern: '<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*>.*?<\\/\\1>',
    flags: { g: true, i: true, m: false, s: true, u: false },
  },
  {
    name: '强密码',
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
    flags: { g: false, i: false, m: false, s: false, u: false },
  },
]

function applyPreset(p: (typeof presets)[0]) {
  pattern.value = p.pattern
  flags.value = { ...p.flags }
}

function highlightPattern(p: string): string {
  let out = ''
  let i = 0
  while (i < p.length) {
    const c = p[i]!
    if (c === '\\' && i + 1 < p.length) {
      out += `<span class="text-tertiary font-medium">${escapeHtml(c + p[i + 1]!)}</span>`
      i += 2
      continue
    }
    if ('[]'.includes(c)) {
      out += `<span class="text-primary">${escapeHtml(c)}</span>`
    } else if ('()'.includes(c)) {
      out += `<span class="text-blue-600 dark:text-blue-400">${escapeHtml(c)}</span>`
    } else if ('{}'.includes(c)) {
      out += `<span class="text-green-600 dark:text-green-400">${escapeHtml(c)}</span>`
    } else if ('^$|.*+?'.includes(c)) {
      out += `<span class="text-tertiary font-medium">${escapeHtml(c)}</span>`
    } else {
      out += escapeHtml(c)
    }
    i++
  }
  return out
}

const highlightedPattern = computed(() => highlightPattern(pattern.value))
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <!-- 预设 -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="p in presets"
        :key="p.name"
        @click="applyPreset(p)"
        class="rounded-full bg-surface-variant px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container transition-colors"
      >
        {{ p.name }}
      </button>
    </div>

    <div
      class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4"
    >
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-on-surface font-mono">/</span>
        <input
          v-model="pattern"
          @blur="saveHistory"
          placeholder="正则表达式"
          class="h-10 flex-1 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
        />
        <span class="text-on-surface font-mono">/</span>
        <div class="flex gap-2">
          <label
            v-for="(_, key) in flags"
            :key="key"
            class="flex cursor-pointer items-center gap-1 rounded-full bg-surface-variant px-3 py-1 text-xs font-medium text-on-surface-variant select-none"
          >
            <input
              v-model="flags[key as keyof typeof flags]"
              type="checkbox"
              class="h-3.5 w-3.5 accent-primary"
            />
            {{ key }}
          </label>
        </div>
      </div>
      <div v-if="pattern" class="rounded bg-surface-variant/50 px-3 py-1.5">
        <span class="mr-2 text-xs text-on-surface-variant">语法预览:</span>
        <code class="font-mono text-xs" v-html="highlightedPattern" />
      </div>
      <div v-if="error" class="text-xs text-error">{{ error }}</div>

      <div class="flex items-center justify-between border-b border-outline-variant pb-2">
        <div class="flex gap-2">
          <button
            @click="activeTab = 'match'"
            class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            :class="
              activeTab === 'match'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-variant'
            "
          >
            匹配
          </button>
        <button
          @click="activeTab = 'replace'"
          class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
          :class="
            activeTab === 'replace'
              ? 'bg-secondary-container text-on-secondary-container'
              : 'text-on-surface-variant hover:bg-surface-variant'
          "
        >
          替换
        </button>
        <button
          @click="activeTab = 'split'"
          class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
          :class="
            activeTab === 'split'
              ? 'bg-secondary-container text-on-secondary-container'
              : 'text-on-surface-variant hover:bg-surface-variant'
          "
        >
          分割
        </button>
        </div>
        <HistoryPanel
          :items="regexHistory.items.value"
          @select="onHistorySelect"
          @remove="regexHistory.remove"
          @clear="regexHistory.clear"
        />
      </div>

      <textarea
        v-model="text"
        @blur="saveHistory"
        placeholder="输入测试文本..."
        class="h-40 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      <div v-if="activeTab === 'replace'" class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="text-sm text-on-surface-variant">替换为:</span>
          <input
            v-model="replaceWith"
            placeholder="替换内容"
            class="h-10 flex-1 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
          />
        </div>
        <div class="flex items-center gap-1 text-xs text-on-surface-variant">
          <Lightbulb class="h-3 w-3" />
          支持
          <code class="rounded bg-surface-variant px-1">$&amp;</code> 匹配项,
          <code class="rounded bg-surface-variant px-1">$1</code>
          <code class="rounded bg-surface-variant px-1">$2</code> 捕获组,
          <code class="rounded bg-surface-variant px-1">$`</code> 匹配前,
          <code class="rounded bg-surface-variant px-1">$'</code> 匹配后
        </div>
      </div>

      <!-- 结果 -->
      <div class="rounded-xl bg-surface-variant/50 p-4">
        <div class="mb-2 text-xs font-medium text-on-surface-variant">结果</div>
        <div
          v-if="resultNotice"
          class="mb-2 rounded-lg bg-primary-container px-3 py-2 text-xs text-on-primary-container"
        >
          {{ resultNotice }}
        </div>

        <div v-if="activeTab === 'match'">
          <pre class="whitespace-pre-wrap text-sm text-on-surface" v-html="highlightedResult" />
          <div v-if="matches.length" class="mt-3 space-y-2">
            <div
              v-for="(match, idx) in matches"
              :key="idx"
              class="rounded-lg bg-surface p-2 text-xs"
            >
              <div class="flex items-center gap-2">
                <span class="font-medium text-primary">#{{ idx + 1 }}</span>
                <span class="text-on-surface-variant">index: {{ match.index }}</span>
                <code class="rounded bg-surface-variant px-1 font-mono text-on-surface">{{
                  JSON.stringify(match.text)
                }}</code>
              </div>
              <div v-if="match.groups.length" class="mt-1 flex flex-wrap gap-2">
                <span
                  v-for="(g, gIdx) in match.groups"
                  :key="gIdx"
                  class="rounded bg-primary-container/30 px-1.5 py-0.5 font-mono text-on-surface"
                >
                  ${{ gIdx + 1 }}: {{ JSON.stringify(g) }}
                </span>
              </div>
            </div>
          </div>
          <div v-if="!matches.length && text && regex" class="mt-2 text-xs text-on-surface-variant">
            未匹配到结果
          </div>
        </div>

        <div v-if="activeTab === 'replace'">
          <pre class="whitespace-pre-wrap text-sm text-on-surface">{{ replaceResult }}</pre>
          <button
            @click="copy(replaceResult, 'replace')"
            class="mt-2 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-primary hover:bg-primary-container"
          >
            <Check v-if="copiedMap['replace']" class="h-3.5 w-3.5" />
            <Copy v-else class="h-3.5 w-3.5" />
            {{ copiedMap['replace'] ? '已复制' : '复制' }}
          </button>
        </div>

        <div v-if="activeTab === 'split'" class="space-y-1">
          <div
            v-for="(part, idx) in splitResult"
            :key="idx"
            class="rounded bg-surface px-2 py-1 text-sm text-on-surface"
          >
            [{{ idx }}] {{ part }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
