<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy, Check, AlignLeft, Minimize2 } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'

const input = ref('')
const error = ref('')
const copied = ref(false)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const lineRef = ref<HTMLDivElement | null>(null)

const lineNumbers = computed(() => {
  const lines = input.value.split('\n').length
  return Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1).join('\n')
})

function syncScroll() {
  if (inputRef.value && lineRef.value) {
    lineRef.value.scrollTop = inputRef.value.scrollTop
  }
}

const formatted = computed(() => {
  if (!input.value.trim()) return ''
  try {
    error.value = ''
    const obj = JSON.parse(input.value)
    return JSON.stringify(obj, null, 2)
  } catch (e: any) {
    error.value = e.message || 'JSON 格式错误'
    return ''
  }
})

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

async function copyFormatted() {
  if (!formatted.value) return
  const ok = await copyToClipboard(formatted.value)
  if (!ok) return
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function syntaxHighlight(json: string): string {
  if (!json) return ''
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /(".*?")(\s*:\s*)?/g,
      (match, key, colon) => {
        if (colon) {
          return `<span class="text-primary">${key}</span><span class="text-on-surface-variant">${colon}</span>`
        }
        return `<span class="text-green-600">${key}</span>`
      }
    )
    .replace(/\b(true|false|null)\b/g, '<span class="text-tertiary font-medium">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-blue-600">$1</span>')
}
</script>

<template>
  <div class="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl flex-col gap-4 md:flex-row">
    <!-- 输入区 -->
    <div class="flex flex-1 flex-col rounded-2xl bg-surface shadow-sm outline outline-1 outline-outline-variant">
      <div class="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <span class="text-sm font-medium text-on-surface-variant">输入</span>
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
        </div>
      </div>
      <div class="relative flex flex-1 overflow-hidden">
        <div
          ref="lineRef"
          class="w-10 shrink-0 overflow-hidden bg-surface-variant/30 py-4 pr-2 text-right font-mono text-xs leading-5 text-on-surface-variant select-none"
        >
          <pre class="m-0">{{ lineNumbers }}</pre>
        </div>
        <textarea
          ref="inputRef"
          v-model="input"
          placeholder="在此粘贴 JSON..."
          class="flex-1 resize-none bg-transparent py-4 pl-3 pr-4 font-mono text-sm leading-5 text-on-surface outline-none"
          spellcheck="false"
          @scroll="syncScroll"
        />
      </div>
      <div v-if="error" class="px-4 pb-3 text-xs text-error">{{ error }}</div>
    </div>

    <!-- 预览区 -->
    <div class="flex flex-1 flex-col rounded-2xl bg-surface shadow-sm outline outline-1 outline-outline-variant">
      <div class="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <span class="text-sm font-medium text-on-surface-variant">预览</span>
        <div class="flex gap-2">
          <button
            @click="escapeJson"
            class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
          >
            转义字符串
          </button>
          <button
            v-if="formatted"
            @click="copyFormatted"
            class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
          >
            <Check v-if="copied" class="h-3.5 w-3.5" />
            <Copy v-else class="h-3.5 w-3.5" />
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>
      </div>
      <pre
        v-if="formatted"
        class="flex-1 overflow-auto rounded-b-2xl p-4 font-mono text-sm leading-relaxed text-on-surface"
        v-html="syntaxHighlight(formatted)"
      />
      <div v-else class="flex flex-1 items-center justify-center text-sm text-on-surface-variant">
        等待有效 JSON...
      </div>
    </div>
  </div>
</template>
