<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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

function toggleTree() {
  showTree.value = !showTree.value
}

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
    <ToolHeader title="JSON 编辑器" description="格式化、压缩、转义、JWT 解析与树形预览" icon="i-lucide-braces" />

    <ToolCard :padding="false">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-default px-4 py-3">
        <span class="text-sm font-medium text-muted">JSON 编辑器</span>
        <div class="flex flex-wrap items-center gap-2">
          <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
          <UButton color="neutral" variant="ghost" @click="openFind" class="rounded-full text-xs text-primary hover:bg-primary/10">
            <template #leading><UIcon name="i-lucide-search" class="size-3.5" /></template>搜索
          </UButton>
          <UButton color="neutral" variant="ghost" @click="formatJson" class="rounded-full text-xs text-primary hover:bg-primary/10">
            <template #leading><UIcon name="i-lucide-align-left" class="size-3.5" /></template>格式化
          </UButton>
          <UButton color="neutral" variant="ghost" @click="compressJson" class="rounded-full text-xs text-primary hover:bg-primary/10">
            <template #leading><UIcon name="i-lucide-minimize-2" class="size-3.5" /></template>压缩
          </UButton>
          <UButton color="neutral" variant="ghost" @click="escapeJson" class="rounded-full text-xs text-primary hover:bg-primary/10">转义</UButton>
          <UButton color="neutral" variant="ghost" @click="parseJwt" class="rounded-full text-xs text-primary hover:bg-primary/10">
            <template #leading><UIcon name="i-lucide-key-round" class="size-3.5" /></template>解析 JWT
          </UButton>
          <CopyBtn :text="input" variant="button" />
          <UButton
            color="neutral" variant="ghost"
            :label="showTree ? '隐藏树视图' : '显示树视图'"
            :icon="showTree ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'"
            @click="toggleTree"
            class="rounded-full text-xs text-primary hover:bg-primary/10"
            :class="showTree ? 'bg-primary/10' : ''"
          />
        </div>
      </div>

      <div class="flex flex-1 overflow-visible" style="min-height: 400px">
        <div class="relative flex flex-1">
          <MonacoEditor ref="monacoRef" v-model="input" language="json" :options="{ wordWrap: 'on', find: { addExtraSpaceOnTop: true, autoFindInSelection: 'never' } }" @blur="saveHistory" />
        </div>
        <div v-show="showTree" class="hidden w-80 overflow-auto border-l border-default bg-default/50 md:block">
          <div class="sticky top-0 z-10 border-b border-default bg-elevated px-3 py-2 text-xs font-medium text-muted backdrop-blur">结构预览</div>
          <div class="p-2">
            <JsonTree v-if="parsed !== null" :data="parsed" />
            <UAlert v-else-if="input.trim()" class="m-2" :color="error ? 'error' : 'success'" variant="soft" :icon="error ? 'i-lucide-circle-alert' : 'i-lucide-circle-check'" :description="error || status || '无法解析为 JSON'" />
            <div v-else class="px-2 py-4 text-xs text-muted">输入 JSON 以查看树形结构</div>
          </div>
        </div>
      </div>

      <div v-if="error || status" class="border-t border-default px-4 py-2">
        <UBadge :color="error ? 'error' : 'success'" variant="soft" size="sm">
          {{ error || status }}
        </UBadge>
      </div>
    </ToolCard>
  </ToolLayout>
</template>
