<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  AlignLeft,
  Minimize2,
  TreePine,
  Search,
  KeyRound,
  Braces,
} from '@lucide/vue'
import { useToolState } from '@/composables'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolHeader from '@/components/ToolHeader.vue'
import ToolCard from '@/components/ToolCard.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'
import CopyBtn from '@/components/CopyBtn.vue'
import JsonTree from '@/components/JsonTree.vue'
import MonacoEditor from '@/components/MonacoEditor.vue'

const { input, history, saveHistory } = useToolState<string, { input: string }>({
  storageKey: 'json',
  defaultInput: '',
  historyOptions: {
    maxCount: 15,
    generateLabel: (d) => d.input.replace(/\s+/g, ' ').slice(0, 50) + (d.input.length > 50 ? '...' : ''),
  },
})

function onHistorySelect(item: { data: { input: string } }) {
  input.value = item.data.input
}

const error = ref('')
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
  try { const obj = JSON.parse(input.value); input.value = JSON.stringify(obj); error.value = '' }
  catch (e: any) { error.value = e.message || 'JSON 格式错误' }
}

function escapeJson() {
  if (!input.value.trim()) return
  try { const obj = JSON.parse(input.value); input.value = JSON.stringify(JSON.stringify(obj)); error.value = '' }
  catch (e: any) { error.value = e.message || 'JSON 格式错误' }
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
      for (const key of ['token', 'access_token', 'id_token', 'jwt', 'authorization']) {
        const candidate = (value as Record<string, unknown>)[key]
        if (typeof candidate === 'string') return candidate.replace(/^Bearer\s+/i, '')
      }
    }
  } catch { /* not JSON */ }
  return ''
}

function parseJwt() {
  const token = extractJwt()
  const parts = token.split('.')
  if (parts.length !== 3) { error.value = '未找到有效 JWT'; return }
  try {
    input.value = JSON.stringify({ header: base64UrlDecode(parts[0]!), payload: base64UrlDecode(parts[1]!), signature: parts[2], raw: token }, null, 2)
    error.value = ''
  } catch (e: any) { error.value = e.message || 'JWT 解析失败' }
}

function openFind() {
  const editor = monacoRef.value?.getEditor()
  if (editor) (editor as any).getAction('actions.find')?.run()
}

let validateTimer: ReturnType<typeof setTimeout> | null = null
function validateJson() {
  if (validateTimer) clearTimeout(validateTimer)
  validateTimer = setTimeout(() => {
    if (!input.value.trim()) { error.value = ''; parsed.value = null; status.value = ''; return }
    try { const obj = JSON.parse(input.value); parsed.value = obj; status.value = 'JSON 有效'; error.value = '' }
    catch (e: any) { error.value = e.message || 'JSON 格式错误'; parsed.value = null; status.value = '' }
  }, 200)
}

watch(input, validateJson, { immediate: true })
</script>

<template>
  <ToolLayout max-width="6xl">
    <ToolHeader title="JSON 编辑器" description="格式化、压缩、转义、JWT 解析与树形预览" :icon="Braces" />

    <ToolCard :padding="false">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant px-4 py-3">
        <span class="text-sm font-medium text-on-surface-variant">JSON 编辑器</span>
        <div class="flex flex-wrap items-center gap-2">
          <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
          <UButton variant="ghost" color="neutral" @click="openFind" class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors">
            <Search class="h-3.5 w-3.5" /> 搜索
          </UButton>
          <UButton variant="ghost" color="neutral" @click="formatJson" class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors">
            <AlignLeft class="h-3.5 w-3.5" /> 格式化
          </UButton>
          <UButton variant="ghost" color="neutral" @click="compressJson" class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors">
            <Minimize2 class="h-3.5 w-3.5" /> 压缩
          </UButton>
          <UButton variant="ghost" color="neutral" @click="escapeJson" class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors">
            转义
          </UButton>
          <UButton variant="ghost" color="neutral" @click="parseJwt" class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors">
            <KeyRound class="h-3.5 w-3.5" /> 解析 JWT
          </UButton>
          <CopyBtn :text="input" variant="button" />
          <UButton variant="ghost" color="neutral" @click="showTree = !showTree" class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors" :class="showTree ? 'bg-primary-container' : ''">
            <TreePine class="h-3.5 w-3.5" /> 树视图
          </UButton>
        </div>
      </div>

      <div class="flex flex-1 overflow-visible" style="min-height: 400px">
        <div class="relative flex flex-1">
          <MonacoEditor ref="monacoRef" v-model="input" language="json" :options="{ wordWrap: 'on', find: { addExtraSpaceOnTop: true, autoFindInSelection: 'never' } }" @blur="saveHistory" />
        </div>
        <div v-if="showTree" class="hidden w-80 overflow-auto border-l border-outline-variant bg-surface-variant/20 md:block">
          <div class="sticky top-0 z-10 border-b border-outline-variant bg-surface-variant/40 px-3 py-2 text-xs font-medium text-on-surface-variant backdrop-blur">
            结构预览
          </div>
          <div class="p-2">
            <JsonTree v-if="parsed !== null" :data="parsed" />
            <div v-else-if="input.trim()" class="px-2 py-4 text-xs text-error">{{ error || status || '无法解析为 JSON' }}</div>
            <div v-else class="px-2 py-4 text-xs text-on-surface-variant">输入 JSON 以查看树形结构</div>
          </div>
        </div>
      </div>

      <div v-if="error || status" class="border-t border-outline-variant px-4 py-2 text-xs" :class="error ? 'text-error' : 'text-on-surface-variant'">
        {{ error || status }}
      </div>
    </ToolCard>
  </ToolLayout>
</template>