<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy, Check } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'

const pattern = ref('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}')
const flags = ref({ g: true, i: true, m: false, s: false, u: false })
const text = ref(`contact@example.com
support@company.org
invalid-email
user.name+tag@domain.co.uk`)
const replaceWith = ref('')
const activeTab = ref<'match' | 'replace' | 'split'>('match')

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

const matches = computed(() => {
  if (!regex.value || !text.value) return []
  if (activeTab.value !== 'match') return []
  const arr: { text: string; index: number }[] = []
  let m: RegExpExecArray | null
  const r = regex.value
  if (flags.value.g) {
    while ((m = r.exec(text.value)) !== null) {
      if (m.index === r.lastIndex) r.lastIndex++
      arr.push({ text: m[0], index: m.index })
    }
  } else {
    m = r.exec(text.value)
    if (m) arr.push({ text: m[0], index: m.index })
  }
  return arr
})

const replaceResult = computed(() => {
  if (!regex.value || activeTab.value !== 'replace') return ''
  return text.value.replace(regex.value, replaceWith.value)
})

const splitResult = computed(() => {
  if (!regex.value || activeTab.value !== 'split') return []
  return text.value.split(regex.value)
})

function highlightedText(): string {
  if (!text.value || activeTab.value !== 'match' || !regex.value || matches.value.length === 0) {
    return escapeHtml(text.value)
  }
  const m = matches.value
  let result = ''
  let last = 0
  for (const match of m) {
    result += escapeHtml(text.value.slice(last, match.index))
    result += `<mark class="rounded bg-primary-container px-0.5 text-on-primary-container">${escapeHtml(match.text)}</mark>`
    last = match.index + match.text.length
  }
  result += escapeHtml(text.value.slice(last))
  return result
}

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
  { name: '邮箱', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', flags: { g: true, i: true, m: false, s: false, u: false } },
  { name: '手机号(中国大陆)', pattern: '1[3-9]\\d{9}', flags: { g: true, i: false, m: false, s: false, u: false } },
  { name: 'URL', pattern: 'https?://[^\\s]+', flags: { g: true, i: true, m: false, s: false, u: false } },
  { name: 'IP 地址', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: { g: true, i: false, m: false, s: false, u: false } },
  { name: '身份证号', pattern: '\\d{17}[\\dXx]|\\d{15}', flags: { g: true, i: false, m: false, s: false, u: false } },
  { name: '日期(YYYY-MM-DD)', pattern: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])', flags: { g: true, i: false, m: false, s: false, u: false } },
]

function applyPreset(p: typeof presets[0]) {
  pattern.value = p.pattern
  flags.value = { ...p.flags }
}
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

    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-on-surface">/</span>
        <input
          v-model="pattern"
          placeholder="正则表达式"
          class="h-10 flex-1 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <span class="text-on-surface">/</span>
        <div class="flex gap-2">
          <label v-for="(_, key) in flags" :key="key" class="flex cursor-pointer items-center gap-1 rounded-full bg-surface-variant px-3 py-1 text-xs font-medium text-on-surface-variant select-none">
            <input v-model="flags[key as keyof typeof flags]" type="checkbox" class="h-3.5 w-3.5 accent-primary" />
            {{ key }}
          </label>
        </div>
      </div>
      <div v-if="error" class="text-xs text-error">{{ error }}</div>

      <div class="flex gap-2 border-b border-outline-variant pb-2">
        <button @click="activeTab = 'match'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="activeTab === 'match' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant'">匹配</button>
        <button @click="activeTab = 'replace'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="activeTab === 'replace' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant'">替换</button>
        <button @click="activeTab = 'split'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="activeTab === 'split' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant'">分割</button>
      </div>

      <textarea v-model="text" placeholder="输入测试文本..." class="h-40 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />

      <div v-if="activeTab === 'replace'" class="flex items-center gap-2">
        <span class="text-sm text-on-surface-variant">替换为:</span>
        <input v-model="replaceWith" placeholder="替换内容" class="h-10 flex-1 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      </div>

      <!-- 结果 -->
      <div class="rounded-xl bg-surface-variant/50 p-4">
        <div class="mb-2 text-xs font-medium text-on-surface-variant">结果</div>

        <div v-if="activeTab === 'match'">
          <pre class="whitespace-pre-wrap text-sm text-on-surface" v-html="highlightedText()" />
          <div v-if="matches.length" class="mt-2 text-xs text-on-surface-variant">共匹配 {{ matches.length }} 处</div>
        </div>

        <div v-if="activeTab === 'replace'">
          <pre class="whitespace-pre-wrap text-sm text-on-surface">{{ replaceResult }}</pre>
          <button @click="copy(replaceResult, 'replace')" class="mt-2 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-primary hover:bg-primary-container">
            <Check v-if="copiedMap['replace']" class="h-3.5 w-3.5" />
            <Copy v-else class="h-3.5 w-3.5" />
            {{ copiedMap['replace'] ? '已复制' : '复制' }}
          </button>
        </div>

        <div v-if="activeTab === 'split'" class="space-y-1">
          <div v-for="(part, idx) in splitResult" :key="idx" class="rounded bg-surface px-2 py-1 text-sm text-on-surface">
            [{{ idx }}] {{ part }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
