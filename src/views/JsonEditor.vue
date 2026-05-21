<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Copy, Check, AlignLeft, Minimize2, TreePine, Search, KeyRound } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'
import { usePersistedRef } from '@/utils/persist'
import { useHistory } from '@/utils/history'
import HistoryPanel from '@/components/HistoryPanel.vue'
import JsonTree from '@/components/JsonTree.vue'
import MonacoEditor from '@/components/MonacoEditor.vue'

const input = usePersistedRef('web-tools:json:input', '')
const error = ref('')

const jsonHistory = useHistory<{ input: string }>('web-tools:json:history', {
  maxCount: 15,
  generateLabel: (d) => d.input.replace(/\s+/g, ' ').slice(0, 50) + (d.input.length > 50 ? '...' : ''),
})

function saveHistory() {
  if (!input.value.trim()) return
  jsonHistory.add({ input: input.value })
}

function onHistorySelect(item: { data: { input: string } }) {
  input.value = item.data.input
}

const copied = ref(false)
const showTree = ref(true)
const parsed = ref<unknown>(null)
const status = ref('')
const monacoRef = ref<InstanceType<typeof MonacoEditor> | null>(null)

function formatJson() {
  const editor = monacoRef.value?.getEditor()
  if (editor) {
    ;(editor as any).getAction('editor.action.formatDocument')?.run()
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

function base64UrlDecode(value: string): unknown {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return JSON.parse(new TextDecoder().decode(bytes))
}

function extractJwt(): string {
  const raw = input.value.trim()
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(raw)) return raw

  try {
    const value = JSON.parse(raw)
    if (typeof value === 'string') return value
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      for (const key of ['token', 'access_token', 'id_token', 'jwt', 'authorization']) {
        const candidate = record[key]
        if (typeof candidate === 'string') return candidate.replace(/^Bearer\s+/i, '')
      }
    }
  } catch {
    // 非 JSON 时按纯 JWT 文本处理。
  }

  return ''
}

function parseJwt() {
  const token = extractJwt()
  const parts = token.split('.')
  if (parts.length !== 3) {
    error.value = '未找到有效 JWT。请粘贴 JWT 字符串，或包含 token/access_token/id_token 字段的 JSON。'
    return
  }

  try {
    input.value = JSON.stringify(
      {
        header: base64UrlDecode(parts[0]!),
        payload: base64UrlDecode(parts[1]!),
        signature: parts[2],
        raw: token,
      },
      null,
      2,
    )
    error.value = ''
  } catch (e: any) {
    error.value = e.message || 'JWT 解析失败'
  }
}

async function copyText() {
  if (!input.value) return
  const ok = await copyToClipboard(input.value)
  if (!ok) return
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function openFind() {
  const editor = monacoRef.value?.getEditor()
  if (editor) {
    ;(editor as any).getAction('actions.find')?.run()
  }
}

let validateTimer: ReturnType<typeof setTimeout> | null = null
function validateJson() {
  if (validateTimer) clearTimeout(validateTimer)
  validateTimer = setTimeout(() => {
    if (!input.value.trim()) {
      error.value = ''
      parsed.value = null
      status.value = ''
      return
    }
    try {
      const obj = JSON.parse(input.value)
      parsed.value = obj
      status.value = 'JSON 有效'
      error.value = ''
    } catch (e: any) {
      error.value = e.message || 'JSON 格式错误'
      parsed.value = null
      status.value = ''
    }
  }, 200)
}

watch(input, validateJson, { immediate: true })
</script>

<template>
  <div
    class="mx-auto flex h-[calc(100vh-10rem)] max-w-6xl flex-col rounded-2xl bg-surface shadow-sm outline outline-1 outline-outline-variant"
  >
    <!-- 工具栏 -->
    <div
      class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant px-4 py-3"
    >
      <span class="text-sm font-medium text-on-surface-variant">JSON 编辑器</span>
      <div class="flex flex-wrap items-center gap-2">
        <HistoryPanel
          :items="jsonHistory.items.value"
          @select="onHistorySelect"
          @remove="jsonHistory.remove"
          @clear="jsonHistory.clear"
        />
        <button
          @click="openFind"
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
        >
          <Search class="h-3.5 w-3.5" />
          搜索
        </button>
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
          @click="parseJwt"
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
        >
          <KeyRound class="h-3.5 w-3.5" />
          解析 JWT
        </button>
        <button
          @click="copyText"
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
        >
          <Check v-if="copied" class="h-3.5 w-3.5" />
          <Copy v-else class="h-3.5 w-3.5" />
          {{ copied ? '已复制' : '复制' }}
        </button>
        <button
          @click="showTree = !showTree"
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
          :class="showTree ? 'bg-primary-container' : ''"
        >
          <TreePine class="h-3.5 w-3.5" />
          树视图
        </button>
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- 编辑器区域 -->
      <div class="relative flex flex-1 overflow-hidden">
        <MonacoEditor
          ref="monacoRef"
          v-model="input"
          language="json"
          :options="{ wordWrap: 'on' }"
          @blur="saveHistory"
        />
      </div>

      <!-- 树视图 -->
      <div
        v-if="showTree"
        class="hidden w-80 overflow-auto border-l border-outline-variant bg-surface-variant/20 md:block"
      >
        <div
          class="sticky top-0 z-10 border-b border-outline-variant bg-surface-variant/40 px-3 py-2 text-xs font-medium text-on-surface-variant backdrop-blur"
        >
          结构预览
        </div>
        <div class="p-2">
          <JsonTree v-if="parsed !== null" :data="parsed" />
          <div v-else-if="input.trim()" class="px-2 py-4 text-xs text-error">
            {{ error || status || '无法解析为 JSON' }}
          </div>
          <div v-else class="px-2 py-4 text-xs text-on-surface-variant">
            输入 JSON 以查看树形结构
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="error || status"
      class="border-t border-outline-variant px-4 py-2 text-xs"
      :class="error ? 'text-error' : 'text-on-surface-variant'"
    >
      {{ error || status }}
    </div>
  </div>
</template>
