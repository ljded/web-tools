<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToolState } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import CopyBtn from '@/components/CopyBtn.vue'
import JsonTree from '@/components/JsonTree.vue'
import MonacoEditor from '@/components/MonacoEditor.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'

const { input, history, saveHistory } = useToolState<string, { input: string }>({
  storageKey: 'json',
  defaultInput: '',
  getHistoryData: (value) => ({ input: value }),
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
  <ToolPage name="json" max-width="6xl">
    <ToolSection compact>
      <div class="tool-command-bar justify-between">
        <div class="flex flex-wrap items-center gap-2">
          <UBadge :color="error ? 'error' : status ? 'success' : 'neutral'" variant="soft" size="sm" class="rounded-full">
            {{ error ? '格式错误' : status || '等待输入' }}
          </UBadge>
          <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-search" class="rounded-full" @click="openFind">搜索</UButton>
          <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-align-left" class="rounded-full" @click="formatJson">格式化</UButton>
          <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-minimize-2" class="rounded-full" @click="compressJson">压缩</UButton>
          <UButton color="neutral" variant="soft" size="sm" class="rounded-full" @click="escapeJson">转义</UButton>
          <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-key-round" class="rounded-full" @click="parseJwt">解析 JWT</UButton>
          <CopyBtn :text="input" variant="button" />
          <UButton
            color="primary"
            variant="soft"
            size="sm"
            :label="showTree ? '隐藏树视图' : '显示树视图'"
            :icon="showTree ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'"
            class="rounded-full"
            @click="toggleTree"
          />
        </div>
      </div>
    </ToolSection>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.78fr)]">
      <ToolSection title="JSON 编辑器" description="格式化、压缩、转义或解析 JWT，校验状态会实时更新。" :padding="false">
        <div class="h-[calc(100vh-16rem)] min-h-[560px] overflow-hidden rounded-b-[1.75rem]">
          <MonacoEditor ref="monacoRef" v-model="input" language="json" :options="{ wordWrap: 'on', find: { addExtraSpaceOnTop: true, autoFindInSelection: 'never' } }" @blur="saveHistory" />
        </div>
        <div v-if="error || status" class="hig-divider border-t px-4 py-3">
          <UBadge :color="error ? 'error' : 'success'" variant="soft" size="sm" class="rounded-full">
            {{ error || status }}
          </UBadge>
        </div>
      </ToolSection>

      <div v-show="showTree" class="tool-preview-sticky">
        <ToolSection title="结构预览" description="在桌面端固定显示，移动端会排在编辑器下方。">
          <div class="hig-subtle-surface max-h-[640px] overflow-auto rounded-[1.35rem] border p-3">
            <JsonTree v-if="parsed !== null" :data="parsed" />
            <UAlert v-else-if="input.trim()" :color="error ? 'error' : 'success'" variant="soft" :icon="error ? 'i-lucide-circle-alert' : 'i-lucide-circle-check'" :description="error || status || '无法解析为 JSON'" />
            <div v-else class="px-2 py-4 text-sm text-muted">输入 JSON 以查看树形结构</div>
          </div>
        </ToolSection>
      </div>
    </div>
  </ToolPage>
</template>
