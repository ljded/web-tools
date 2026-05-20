<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Copy, Check, AlignLeft, Minimize2 } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'

const input = ref('')
const error = ref('')
const copied = ref(false)
const preRef = ref<HTMLPreElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const lineNumbers = computed(() => {
  const lines = input.value.split('\n').length
  return Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1).join('\n')
})

function syncScroll() {
  if (preRef.value && textareaRef.value) {
    preRef.value.scrollTop = textareaRef.value.scrollTop
    preRef.value.scrollLeft = textareaRef.value.scrollLeft
  }
}

function getLineIndent(text: string, pos: number): string {
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1
  const lineEnd = text.indexOf('\n', pos)
  const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
  const match = line.match(/^(\s*)/)
  return match?.[1] ?? ''
}

function onKeydown(e: KeyboardEvent) {
  const el = e.target as HTMLTextAreaElement
  if (e.key === 'Enter') {
    const start = el.selectionStart
    const end = el.selectionEnd
    const before = input.value[start - 1]
    const after = input.value[end]
    const indent = getLineIndent(input.value, start)

    if ((before === '{' && after === '}') || (before === '[' && after === ']')) {
      e.preventDefault()
      const insert = '\n' + indent + '\t\n' + indent
      input.value = input.value.slice(0, start) + insert + input.value.slice(end)
      nextTick(() => {
        const newPos = start + indent.length + 2
        el.selectionStart = el.selectionEnd = newPos
        syncScroll()
      })
    } else if (before === '{' || before === '[' || before === ',') {
      e.preventDefault()
      const insert = '\n' + indent + '\t'
      input.value = input.value.slice(0, start) + insert + input.value.slice(end)
      nextTick(() => {
        const newPos = start + insert.length
        el.selectionStart = el.selectionEnd = newPos
        syncScroll()
      })
    } else {
      e.preventDefault()
      const insert = '\n' + indent
      input.value = input.value.slice(0, start) + insert + input.value.slice(end)
      nextTick(() => {
        const newPos = start + insert.length
        el.selectionStart = el.selectionEnd = newPos
        syncScroll()
      })
    }
  } else if (e.key === 'Tab') {
    e.preventDefault()
    const start = el.selectionStart
    const end = el.selectionEnd
    input.value = input.value.slice(0, start) + '\t' + input.value.slice(end)
    nextTick(() => {
      el.selectionStart = el.selectionEnd = start + 1
      syncScroll()
    })
  }
}

function formatJson() {
  if (!input.value.trim()) return
  try {
    const obj = JSON.parse(input.value)
    input.value = JSON.stringify(obj, null, 2)
    error.value = ''
  } catch (e: any) {
    error.value = e.message || 'JSON 格式错误'
  }
}

function compressJson() {
  if (!input.value.trim()) return
  try {
    const obj = JSON.parse(input.value)
    input.value = JSON.stringify(obj)
    error.value = ''
  } catch (e: any) {
    error.value = e.message || 'JSON 格式错误'
  }
}

function escapeJson() {
  if (!input.value.trim()) return
  try {
    const obj = JSON.parse(input.value)
    input.value = JSON.stringify(JSON.stringify(obj))
    error.value = ''
  } catch (e: any) {
    error.value = e.message || 'JSON 格式错误'
  }
}

async function copyText() {
  if (!input.value) return
  const ok = await copyToClipboard(input.value)
  if (!ok) return
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function isTimestamp(num: number): boolean {
  if (num >= 1000000000 && num <= 9999999999) return true
  if (num >= 1000000000000 && num <= 9999999999999) return true
  return false
}

function formatTimestamp(num: number): string {
  const ms = num <= 9999999999 ? num * 1000 : num
  const d = new Date(ms)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN')
}

const highlighted = computed(() => {
  if (!input.value.trim()) return ''
  try {
    error.value = ''
    const formatted = JSON.stringify(JSON.parse(input.value), null, 2)
    return highlightJson(formatted)
  } catch {
    return escapeHtml(input.value)
  }
})

function highlightJson(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(?:\\.|[^"\\])*")(\s*:\s*)?/g,
      (match, key, colon) => {
        if (colon) {
          return `<span class="text-primary">${key}</span><span class="text-on-surface-variant">${colon}</span>`
        }
        return `<span class="text-green-600 dark:text-green-400">${key}</span>`
      }
    )
    .replace(/\b(true|false|null)\b/g, '<span class="text-tertiary font-medium">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, (match, numStr) => {
      const num = Number(numStr)
      if (isTimestamp(num)) {
        const date = formatTimestamp(num)
        return `<span class="text-blue-600 dark:text-blue-400" title="${date}">${numStr}</span>`
      }
      return `<span class="text-blue-600 dark:text-blue-400">${numStr}</span>`
    })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
</script>

<template>
  <div class="mx-auto flex h-[calc(100vh-10rem)] max-w-5xl flex-col rounded-2xl bg-surface shadow-sm outline outline-1 outline-outline-variant">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between border-b border-outline-variant px-4 py-3">
      <span class="text-sm font-medium text-on-surface-variant">JSON 编辑器</span>
      <div class="flex gap-2">
        <button
          @click="formatJson"
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
        >
          <AlignLeft class="h-3.5 w-3.5" />
          格式化
        </button>
        <button
          @click="compressJson"
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
        >
          <Minimize2 class="h-3.5 w-3.5" />
          压缩
        </button>
        <button
          @click="escapeJson"
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
        >
          转义
        </button>
        <button
          @click="copyText"
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
        >
          <Check v-if="copied" class="h-3.5 w-3.5" />
          <Copy v-else class="h-3.5 w-3.5" />
          {{ copied ? '已复制' : '复制' }}
        </button>
      </div>
    </div>

    <!-- 编辑器区域 -->
    <div class="relative flex flex-1 overflow-hidden">
      <!-- 行号 -->
      <div class="w-10 shrink-0 overflow-hidden bg-surface-variant/30 py-4 pr-2 text-right font-mono text-xs leading-5 text-on-surface-variant select-none">
        <pre class="m-0">{{ lineNumbers }}</pre>
      </div>

      <!-- 编辑区容器 -->
      <div class="relative flex-1">
        <!-- 高亮层 (底层显示) -->
        <pre
          ref="preRef"
          class="absolute inset-0 m-0 overflow-auto p-4 font-mono text-sm leading-5 text-on-surface pointer-events-none"
          v-html="highlighted"
        />

        <!-- 输入层 (顶层透明) -->
        <textarea
          ref="textareaRef"
          v-model="input"
          placeholder="在此粘贴或编辑 JSON..."
          class="absolute inset-0 m-0 resize-none overflow-auto bg-transparent p-4 font-mono text-sm leading-5 text-transparent caret-on-surface outline-none"
          spellcheck="false"
          @scroll="syncScroll"
          @keydown="onKeydown"
        />
      </div>
    </div>

    <div v-if="error" class="border-t border-outline-variant px-4 py-2 text-xs text-error">
      {{ error }}
    </div>
  </div>
</template>
