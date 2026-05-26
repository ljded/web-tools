<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useToolState } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import MonacoEditor from '@/components/MonacoEditor.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import type * as monaco from 'monaco-editor'

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

let statsTimer: ReturnType<typeof setTimeout> | null = null

function scheduleStatsUpdate(delay = 300) {
  if (statsTimer) clearTimeout(statsTimer)
  statsTimer = setTimeout(() => {
    updateStats()
    statsTimer = null
  }, delay)
}

onMounted(() => { scheduleStatsUpdate(500) })
watch([oldText, newText], () => { scheduleStatsUpdate() })
onBeforeUnmount(() => {
  if (statsTimer) clearTimeout(statsTimer)
})

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

function onImgFiles(files: File[], target: 'a' | 'b') { if (files[0]) setImgFile(files[0], target) }
function setImgFile(file: File, target: 'a' | 'b') {
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (target === 'a') imgA.value = reader.result as string
    else imgB.value = reader.result as string
  }
  reader.readAsDataURL(file)
}
function clearImg(target: 'a' | 'b') {
  if (target === 'a') imgA.value = ''
  else imgB.value = ''
}
</script>

<template>
  <ToolPage name="diff" max-width="6xl" icon="i-lucide-git-compare-arrows">
    <ToolSection compact>
      <UTabs v-model="activeTab" :items="[{ label: '文本对比', value: 'text' }, { label: '图片对比', value: 'image' }]" />
    </ToolSection>

    <div v-if="activeTab === 'text'" class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <ToolSection title="文本差异工作台" description="导入或粘贴两份文本，在 Monaco Diff 中查看逐行变化。" :padding="false" class="min-h-[560px]">
        <div class="tool-command-bar m-4 justify-between">
          <div class="flex flex-wrap items-center gap-2">
            <HistoryPanel
              :items="history.items.value"
              @select="onHistorySelect"
              @remove="history.remove"
              @clear="history.clear"
            />
            <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-upload" class="relative rounded-full">
              导入旧文本
              <input type="file" accept=".txt,.md,.json,.js,.ts,.vue,.html,.css" class="absolute inset-0 cursor-pointer opacity-0" @change="loadTextFile($event, 'old')" />
            </UButton>
            <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-upload" class="relative rounded-full">
              导入新文本
              <input type="file" accept=".txt,.md,.json,.js,.ts,.vue,.html,.css" class="absolute inset-0 cursor-pointer opacity-0" @change="loadTextFile($event, 'new')" />
            </UButton>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-x" class="rounded-full" :disabled="!oldText" @click="clearText('old')">清空旧文本</UButton>
            <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-x" class="rounded-full" :disabled="!newText" @click="clearText('new')">清空新文本</UButton>
            <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-refresh-cw" class="rounded-full" @click="swap">交换</UButton>
            <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-trash2" class="rounded-full" :disabled="!oldText && !newText" @click="clearAllText">全部清空</UButton>
          </div>
        </div>
        <div class="h-[calc(100vh-18rem)] min-h-[500px] overflow-hidden rounded-b-[1.75rem]">
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
      </ToolSection>

      <div class="tool-preview-sticky space-y-4">
        <ToolSection title="差异统计" compact>
          <div class="grid grid-cols-1 gap-3">
            <div class="tool-metric-card">
              <div class="text-3xl font-black text-success">{{ diffStats.added }}</div>
              <div class="text-xs text-muted">新增行</div>
            </div>
            <div class="tool-metric-card">
              <div class="text-3xl font-black text-error">{{ diffStats.removed }}</div>
              <div class="text-xs text-muted">删除行</div>
            </div>
            <div class="tool-metric-card">
              <div class="text-3xl font-black text-highlighted">{{ diffStats.same }}</div>
              <div class="text-xs text-muted">不变行</div>
            </div>
          </div>
        </ToolSection>
      </div>
    </div>

    <div v-else class="tool-workspace">
      <ToolSection title="图片对比" description="上传两张图片，选择并排或叠加方式查看差异。">
        <div class="space-y-5">
          <div class="tool-command-bar justify-between">
            <UTabs v-model="imgMode" :items="[{ label: '并排对比', value: 'side' }, { label: '叠加对比', value: 'overlay' }]" color="neutral" size="sm" />
            <div v-if="imgMode === 'overlay'" class="flex items-center gap-2">
              <span class="text-xs text-muted">透明度</span>
              <USlider v-model="imgOpacity" :min="0" :max="100" :step="1" class="w-32" />
              <span class="text-xs text-default">{{ imgOpacity }}%</span>
            </div>
          </div>

          <div class="tool-control-grid">
            <div>
              <div class="mb-2 flex items-center justify-between">
                <span class="text-sm font-medium text-muted">图片 A</span>
                <UButton v-if="imgA" color="neutral" variant="ghost" icon="i-lucide-trash2" @click="clearImg('a')" class="rounded-full text-xs">清空</UButton>
              </div>
              <div v-if="imgA" class="hig-subtle-surface flex h-52 items-center justify-center rounded-[1.75rem] border p-3">
                <img :src="imgA" class="max-h-full max-w-full rounded-lg object-contain" alt="图片 A" />
              </div>
              <FileDropZone v-else accept="image/*" title="点击上传或拖拽图片" icon="i-lucide-image-up" ui-base="h-52 hig-subtle-surface rounded-[1.75rem] border border-dashed transition-colors hover:border-primary/40 hover:bg-primary/5" @files="onImgFiles($event, 'a')" />
            </div>
            <div>
              <div class="mb-2 flex items-center justify-between">
                <span class="text-sm font-medium text-muted">图片 B</span>
                <UButton v-if="imgB" color="neutral" variant="ghost" icon="i-lucide-trash2" @click="clearImg('b')" class="rounded-full text-xs">清空</UButton>
              </div>
              <div v-if="imgB" class="hig-subtle-surface flex h-52 items-center justify-center rounded-[1.75rem] border p-3">
                <img :src="imgB" class="max-h-full max-w-full rounded-lg object-contain" alt="图片 B" />
              </div>
              <FileDropZone v-else accept="image/*" title="点击上传或拖拽图片" icon="i-lucide-image-up" ui-base="h-52 hig-subtle-surface rounded-[1.75rem] border border-dashed transition-colors hover:border-primary/40 hover:bg-primary/5" @files="onImgFiles($event, 'b')" />
            </div>
          </div>
        </div>
      </ToolSection>

      <div class="tool-preview-sticky">
        <ToolSection title="对比预览" compact>
          <div v-if="imgA && imgB">
            <div v-if="imgMode === 'side'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div class="hig-subtle-surface flex items-center justify-center rounded-[1.75rem] border p-3">
                <img :src="imgA" class="max-h-96 max-w-full rounded-lg object-contain" alt="图片 A 预览" />
              </div>
              <div class="hig-subtle-surface flex items-center justify-center rounded-[1.75rem] border p-3">
                <img :src="imgB" class="max-h-96 max-w-full rounded-lg object-contain" alt="图片 B 预览" />
              </div>
            </div>
            <div v-else class="hig-subtle-surface relative flex min-h-96 items-center justify-center overflow-hidden rounded-[1.75rem] border p-3">
              <img :src="imgA" class="max-h-96 max-w-full rounded-lg object-contain" alt="图片 A 预览" />
              <img :src="imgB" class="absolute inset-0 m-auto max-h-96 max-w-full rounded-lg object-contain" :style="{ opacity: imgOpacity / 100 }" alt="图片 B 叠加预览" />
            </div>
          </div>
          <div v-else class="tool-stage p-6 text-center text-sm text-muted">上传两张图片后显示对比预览。</div>
        </ToolSection>
      </div>
    </div>
  </ToolPage>
</template>
