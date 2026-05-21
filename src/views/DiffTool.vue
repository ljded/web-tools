<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { RefreshCw, Upload, Trash2 } from '@lucide/vue'
import { usePersistedRef } from '@/utils/persist'
import { useHistory } from '@/utils/history'
import HistoryPanel from '@/components/HistoryPanel.vue'
import MonacoEditor from '@/components/MonacoEditor.vue'
import * as monaco from 'monaco-editor'

const activeTab = usePersistedRef<'text' | 'image'>('web-tools:diff:tab', 'text')

const diffHistory = useHistory<{ oldText: string; newText: string }>('web-tools:diff:history', {
  maxCount: 10,
  generateLabel: (d) => `旧:${d.oldText.slice(0, 15)}... 新:${d.newText.slice(0, 15)}...`,
})

function saveHistory() {
  if (!oldText.value.trim() && !newText.value.trim()) return
  diffHistory.add({ oldText: oldText.value, newText: newText.value })
}

function onHistorySelect(item: { data: { oldText: string; newText: string } }) {
  oldText.value = item.data.oldText
  newText.value = item.data.newText
}

const oldText = usePersistedRef('web-tools:diff:old', `function calculateTotal(items) {
  return items.length
}`)
const newText = usePersistedRef('web-tools:diff:new', `function calculateTotal(items) {
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

  let removed = 0
  let added = 0

  for (const change of changes) {
    const originalCount = change.originalEndLineNumber - change.originalStartLineNumber + 1
    const modifiedCount = change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1

    if (change.originalEndLineNumber === 0) {
      // pure add
      added += modifiedCount
    } else if (change.modifiedEndLineNumber === 0) {
      // pure delete
      removed += originalCount
    } else {
      // modified
      removed += originalCount
      added += modifiedCount
    }
  }

  // same lines = total lines minus changed lines (approximate)
  const same = Math.max(originalLines - removed, modifiedLines - added, 0)
  diffStats.value = { added, removed, same }
}

onMounted(() => {
  // Monaco diff editor might need a tick to initialize before getting line changes
  setTimeout(updateStats, 500)
})

watch([oldText, newText], () => {
  setTimeout(updateStats, 300)
})

function swap() {
  const t = oldText.value
  oldText.value = newText.value
  newText.value = t
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

function handleTextDrop(e: DragEvent, target: 'old' | 'new') {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) setTextFile(file, target)
}

// ===== 图片对比（保留原有逻辑） =====
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
  <div class="mx-auto max-w-5xl space-y-6">
    <!-- 标签页 -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="t in ['text', 'image'] as const"
        :key="t"
        @click="activeTab = t"
        class="rounded-full px-4 py-2 text-sm font-medium transition-colors"
        :class="
          activeTab === t
            ? 'bg-primary text-on-primary'
            : 'bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80'
        "
      >
        {{ t === 'text' ? '文本对比' : '图片对比' }}
      </button>
    </div>

    <!-- 文本对比 -->
    <div v-if="activeTab === 'text'" class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <HistoryPanel
          :items="diffHistory.items.value"
          @select="onHistorySelect"
          @remove="diffHistory.remove"
          @clear="diffHistory.clear"
        />
        <div class="flex flex-wrap items-center gap-2">
          <label class="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors">
            <Upload class="mr-1 inline h-3 w-3" />
            导入旧文本
            <input type="file" accept=".txt,.md,.json,.js,.ts,.vue,.html,.css" class="hidden" @change="loadTextFile($event, 'old')" />
          </label>
          <label class="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors">
            <Upload class="mr-1 inline h-3 w-3" />
            导入新文本
            <input type="file" accept=".txt,.md,.json,.js,.ts,.vue,.html,.css" class="hidden" @change="loadTextFile($event, 'new')" />
          </label>
          <button
            @click="swap"
            class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
          >
            <RefreshCw class="h-3 w-3" />
            交换
          </button>
        </div>
      </div>

      <!-- Diff 编辑器 -->
      <div
        class="rounded-2xl bg-surface shadow-sm outline outline-1 outline-outline-variant overflow-hidden"
        style="height: calc(100vh - 20rem);"
        @dragover.prevent
        @drop="handleTextDrop($event, 'old')"
        title="拖拽文本文件到此处导入为旧文本"
      >
        <MonacoEditor
          ref="monacoRef"
          diff
          :original="oldText"
          :modified="newText"
          language="text"
          @update:original="oldText = $event"
          @update:modified="newText = $event"
          @blur="saveHistory"
        />
      </div>

      <!-- 统计 -->
      <div
        class="flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm outline outline-1 outline-outline-variant"
      >
        <div class="flex items-center gap-2">
          <span class="inline-block h-3 w-3 rounded-sm bg-green-100 dark:bg-green-900" />
          <span class="text-sm text-on-surface"
            >新增 <strong>{{ diffStats.added }}</strong> 行</span
          >
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-block h-3 w-3 rounded-sm bg-error-container" />
          <span class="text-sm text-on-surface"
            >删除 <strong>{{ diffStats.removed }}</strong> 行</span
          >
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-block h-3 w-3 rounded-sm bg-surface-variant" />
          <span class="text-sm text-on-surface"
            >不变 <strong>{{ diffStats.same }}</strong> 行</span
          >
        </div>
      </div>
    </div>

    <!-- 图片对比 -->
    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-2xl bg-surface p-4 shadow-sm outline outline-1 outline-outline-variant">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-medium text-on-surface-variant">图片 A</span>
            <div class="flex gap-2">
              <label class="cursor-pointer rounded-full px-2 py-1 text-xs font-medium text-primary hover:bg-primary-container transition-colors">
                <Upload class="mr-1 inline h-3 w-3" />
                上传
                <input type="file" accept="image/*" class="hidden" @change="handleImgUpload($event, 'a')" />
              </label>
              <button v-if="imgA" @click="clearImg('a')" class="rounded-full p-1 text-on-surface-variant hover:bg-surface-variant">
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div
            class="flex h-48 items-center justify-center rounded-xl bg-surface-variant/30 transition-colors hover:bg-primary-container/20"
            @dragover.prevent
            @drop="handleImgDrop($event, 'a')"
          >
            <img v-if="imgA" :src="imgA" class="max-h-full max-w-full rounded-lg object-contain" />
            <span v-else class="text-xs text-on-surface-variant">请上传或拖拽图片</span>
          </div>
        </div>
        <div class="rounded-2xl bg-surface p-4 shadow-sm outline outline-1 outline-outline-variant">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-medium text-on-surface-variant">图片 B</span>
            <div class="flex gap-2">
              <label class="cursor-pointer rounded-full px-2 py-1 text-xs font-medium text-primary hover:bg-primary-container transition-colors">
                <Upload class="mr-1 inline h-3 w-3" />
                上传
                <input type="file" accept="image/*" class="hidden" @change="handleImgUpload($event, 'b')" />
              </label>
              <button v-if="imgB" @click="clearImg('b')" class="rounded-full p-1 text-on-surface-variant hover:bg-surface-variant">
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div
            class="flex h-48 items-center justify-center rounded-xl bg-surface-variant/30 transition-colors hover:bg-primary-container/20"
            @dragover.prevent
            @drop="handleImgDrop($event, 'b')"
          >
            <img v-if="imgB" :src="imgB" class="max-h-full max-w-full rounded-lg object-contain" />
            <span v-else class="text-xs text-on-surface-variant">请上传或拖拽图片</span>
          </div>
        </div>
      </div>

      <!-- 对比控制 -->
      <div class="flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm outline outline-1 outline-outline-variant">
        <button
          @click="imgMode = 'side'"
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
          :class="imgMode === 'side' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant'"
        >
          并排对比
        </button>
        <button
          @click="imgMode = 'overlay'"
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
          :class="imgMode === 'overlay' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant'"
        >
          叠加对比
        </button>
        <div v-if="imgMode === 'overlay'" class="flex items-center gap-2">
          <span class="text-xs text-on-surface-variant">透明度</span>
          <input v-model.number="imgOpacity" type="range" min="0" max="100" class="h-4 w-32" />
          <span class="text-xs text-on-surface">{{ imgOpacity }}%</span>
        </div>
      </div>

      <!-- 对比结果 -->
      <div v-if="imgA && imgB" class="rounded-2xl bg-surface p-4 shadow-sm outline outline-1 outline-outline-variant">
        <div v-if="imgMode === 'side'" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="flex items-center justify-center rounded-xl bg-surface-variant/30 p-2">
            <img :src="imgA" class="max-h-96 max-w-full rounded-lg object-contain" />
          </div>
          <div class="flex items-center justify-center rounded-xl bg-surface-variant/30 p-2">
            <img :src="imgB" class="max-h-96 max-w-full rounded-lg object-contain" />
          </div>
        </div>
        <div v-else class="relative flex items-center justify-center overflow-hidden rounded-xl bg-surface-variant/30 p-2">
          <img :src="imgA" class="max-h-96 max-w-full rounded-lg object-contain" />
          <img
            :src="imgB"
            class="absolute inset-0 m-auto max-h-96 max-w-full rounded-lg object-contain"
            :style="{ opacity: imgOpacity / 100 }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
