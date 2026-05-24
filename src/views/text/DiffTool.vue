<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useToolState } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import MonacoEditor from '@/components/MonacoEditor.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import * as monaco from 'monaco-editor'

const activeTab = ref<'text' | 'image'>('text')

const { history } = useToolState<string, { oldText: string; newText: string }>({
  storageKey: 'diff',
  defaultInput: '',
  historyOptions: {
    maxCount: 10,
    generateLabel: (d) => `旧:${d.oldText.slice(0, 15)}... 新:${d.newText.slice(0, 15)}...`,
  },
})

function onHistorySelect(item: { data: { oldText: string; newText: string } }) {
  oldText.value = item.data.oldText
  newText.value = item.data.newText
}

const oldText = ref(`function calculateTotal(items) {
  return items.length
}`)
const newText = ref(`function calculateTotal(items) {
  const total = items.reduce((sum, item) => sum + item.price, 0)
  return total
}`)
const diffStats = ref({ added: 0, removed: 0, same: 0 })
const monacoRef = ref<InstanceType<typeof MonacoEditor> | null>(null)

function updateStats() {
  const editor = monacoRef.value?.getEditor()
  if (!editor) return
  const diffEditor = editor as monaco.editor.IStandaloneDiffEditor
  const changes = diffEditor.getLineChanges()
  if (!changes) return
  const originalModel = diffEditor.getOriginalEditor().getModel()
  const modifiedModel = diffEditor.getModifiedEditor().getModel()
  if (!originalModel || !modifiedModel) return
  const originalLines = originalModel.getLineCount()
  const modifiedLines = modifiedModel.getLineCount()
  let removed = 0, added = 0
  for (const change of changes) {
    const originalCount = change.originalEndLineNumber - change.originalStartLineNumber + 1
    const modifiedCount = change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1
    if (change.originalEndLineNumber === 0) { added += modifiedCount }
    else if (change.modifiedEndLineNumber === 0) { removed += originalCount }
    else { removed += originalCount; added += modifiedCount }
  }
  const same = Math.max(originalLines - removed, modifiedLines - added, 0)
  diffStats.value = { added, removed, same }
}

onMounted(() => { setTimeout(updateStats, 500) })
watch([oldText, newText], () => { setTimeout(updateStats, 300) })

function swap() { const t = oldText.value; oldText.value = newText.value; newText.value = t }
function clearText(target: 'old' | 'new') {
  if (target === 'old') oldText.value = ''
  else newText.value = ''
}
function clearAllText() {
  oldText.value = ''
  newText.value = ''
}

function loadTextFile(e: Event, target: 'old' | 'new') {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setTextFile(file, target)
}
function setTextFile(file: File, target: 'old' | 'new') {
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (target === 'old') oldText.value = String(reader.result)
    else newText.value = String(reader.result)
  }
  reader.readAsText(file)
}

const imgA = ref('')
const imgB = ref('')
const imgOpacity = ref(50)
const imgMode = ref<'side' | 'overlay'>('side')

function handleImgUpload(e: Event, target: 'a' | 'b') {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setImgFile(file, target)
}
function setImgFile(file: File, target: 'a' | 'b') {
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (target === 'a') imgA.value = reader.result as string
    else imgB.value = reader.result as string
  }
  reader.readAsDataURL(file)
}
function handleImgDrop(e: DragEvent, target: 'a' | 'b') {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) setImgFile(file, target)
}
function clearImg(target: 'a' | 'b') {
  if (target === 'a') imgA.value = ''
  else imgB.value = ''
}
</script>

<template>
  <ToolPage name="diff" max-width="5xl" icon="i-lucide-git-compare-arrows">
    <ToolSection compact>
      <UTabs v-model="activeTab" :items="[{ label: '文本对比', value: 'text' }, { label: '图片对比', value: 'image' }]" />
    </ToolSection>

    <!-- 文本对比 -->
    <div v-if="activeTab === 'text'" class="space-y-6">
      <ToolSection :padding="false" class="min-h-[520px]">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-default p-4">
          <HistoryPanel
            :items="history.items.value"
            @select="onHistorySelect"
            @remove="history.remove"
            @clear="history.clear"
          />
          <div class="flex flex-wrap items-center gap-2">
            <UButton color="neutral" variant="ghost" icon="i-lucide-upload" class="relative rounded-full text-xs">
              导入旧文本
              <input type="file" accept=".txt,.md,.json,.js,.ts,.vue,.html,.css" class="absolute inset-0 cursor-pointer opacity-0" @change="loadTextFile($event, 'old')" />
            </UButton>
            <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="clearText('old')" class="rounded-full text-xs" :disabled="!oldText">清空旧文本</UButton>
            <UButton color="neutral" variant="ghost" icon="i-lucide-upload" class="relative rounded-full text-xs">
              导入新文本
              <input type="file" accept=".txt,.md,.json,.js,.ts,.vue,.html,.css" class="absolute inset-0 cursor-pointer opacity-0" @change="loadTextFile($event, 'new')" />
            </UButton>
            <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="clearText('new')" class="rounded-full text-xs" :disabled="!newText">清空新文本</UButton>
            <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" @click="swap" class="rounded-full text-xs">交换</UButton>
            <UButton color="neutral" variant="ghost" icon="i-lucide-trash2" @click="clearAllText" class="rounded-full text-xs" :disabled="!oldText && !newText">全部清空</UButton>
          </div>
        </div>
        <div class="h-[calc(100vh-18rem)] min-h-[420px]">
          <MonacoEditor
            ref="monacoRef"
            diff
            :original="oldText"
            :modified="newText"
            language="text"
            @update:original="oldText = $event"
            @update:modified="newText = $event"
          />
        </div>
        <div class="flex flex-wrap items-center gap-3 border-t border-default p-4">
          <div class="flex items-center gap-2">
            <span class="inline-block h-3 w-3 rounded-sm bg-success/10" />
            <span class="text-sm text-default">新增 <strong>{{ diffStats.added }}</strong> 行</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-block h-3 w-3 rounded-sm bg-error/10" />
            <span class="text-sm text-default">删除 <strong>{{ diffStats.removed }}</strong> 行</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-block h-3 w-3 rounded-sm bg-elevated" />
            <span class="text-sm text-default">不变 <strong>{{ diffStats.same }}</strong> 行</span>
          </div>
        </div>
      </ToolSection>
    </div>

    <!-- 图片对比 -->
    <div v-else class="space-y-6">
      <ToolSection :padding="false">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-default p-4">
          <UTabs v-model="imgMode" :items="[{ label: '并排对比', value: 'side' }, { label: '叠加对比', value: 'overlay' }]" color="neutral" size="sm" />
          <div v-if="imgMode === 'overlay'" class="flex items-center gap-2">
            <span class="text-xs text-muted">透明度</span>
            <USlider v-model="imgOpacity" :min="0" :max="100" :step="1" class="w-32" />
            <span class="text-xs text-default">{{ imgOpacity }}%</span>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
          <div>
            <div class="mb-2 flex items-center justify-between">
              <span class="text-sm font-medium text-muted">图片 A</span>
              <div class="flex gap-2">
                <UButton v-if="!imgA" color="neutral" variant="ghost" icon="i-lucide-upload" class="relative rounded-full text-xs">
                  上传
                  <input type="file" accept="image/*" class="absolute inset-0 cursor-pointer opacity-0" @change="handleImgUpload($event, 'a')" />
                </UButton>
                <UButton v-else color="neutral" variant="ghost" icon="i-lucide-trash2" @click="clearImg('a')" class="rounded-full text-xs">清空</UButton>
              </div>
            </div>
            <div class="flex h-48 items-center justify-center rounded-xl bg-elevated transition-colors hover:bg-primary/10" @dragover.prevent @drop="handleImgDrop($event, 'a')">
              <img v-if="imgA" :src="imgA" class="max-h-full max-w-full rounded-lg object-contain" />
              <span v-else class="text-xs text-muted">请上传或拖拽图片</span>
            </div>
          </div>
          <div>
            <div class="mb-2 flex items-center justify-between">
              <span class="text-sm font-medium text-muted">图片 B</span>
              <div class="flex gap-2">
                <UButton v-if="!imgB" color="neutral" variant="ghost" icon="i-lucide-upload" class="relative rounded-full text-xs">
                  上传
                  <input type="file" accept="image/*" class="absolute inset-0 cursor-pointer opacity-0" @change="handleImgUpload($event, 'b')" />
                </UButton>
                <UButton v-else color="neutral" variant="ghost" icon="i-lucide-trash2" @click="clearImg('b')" class="rounded-full text-xs">清空</UButton>
              </div>
            </div>
            <div class="flex h-48 items-center justify-center rounded-xl bg-elevated transition-colors hover:bg-primary/10" @dragover.prevent @drop="handleImgDrop($event, 'b')">
              <img v-if="imgB" :src="imgB" class="max-h-full max-w-full rounded-lg object-contain" />
              <span v-else class="text-xs text-muted">请上传或拖拽图片</span>
            </div>
          </div>
        </div>

        <div v-if="imgA && imgB" class="border-t border-default bg-elevated/40 p-4">
          <div v-if="imgMode === 'side'" class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="flex items-center justify-center rounded-xl bg-default p-2">
              <img :src="imgA" class="max-h-96 max-w-full rounded-lg object-contain" />
            </div>
            <div class="flex items-center justify-center rounded-xl bg-default p-2">
              <img :src="imgB" class="max-h-96 max-w-full rounded-lg object-contain" />
            </div>
          </div>
          <div v-else class="relative flex items-center justify-center overflow-hidden rounded-xl bg-default p-2">
            <img :src="imgA" class="max-h-96 max-w-full rounded-lg object-contain" />
            <img :src="imgB" class="absolute inset-0 m-auto max-h-96 max-w-full rounded-lg object-contain" :style="{ opacity: imgOpacity / 100 }" />
          </div>
        </div>
      </ToolSection>
    </div>
  </ToolPage>
</template>
