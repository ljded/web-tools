<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToolState } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import MonacoEditor from '@/components/MonacoEditor.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { useRouteQueryValue } from '@/utils/routeQuery'
import type * as monaco from 'monaco-editor'

const { t } = useI18n()

const activeTab = ref<'text' | 'image'>('text')
useRouteQueryValue('tab', activeTab, ['text', 'image'])

const { history } = useToolState<string, { oldText: string; newText: string }>({
  storageKey: 'diff',
  defaultInput: '',
  historyOptions: {
    maxCount: 10,
    generateLabel: (d) => t('tools.diff.historyLabel', { old: d.oldText.slice(0, 15), updated: d.newText.slice(0, 15) }),
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
const imgAFile = ref<File | null>(null)
const imgBFile = ref<File | null>(null)
const imgOpacity = ref(50)
const imgMode = ref<'side' | 'overlay' | 'slider' | 'difference'>('side')
useRouteQueryValue('mode', imgMode, ['side', 'overlay', 'slider', 'difference'])
const sliderPosition = ref(50)
const isDragging = ref(false)

function onImgFiles(files: File[], target: 'a' | 'b') { if (files[0]) setImgFile(files[0], target) }
function setImgFile(file: File, target: 'a' | 'b') {
  if (!file) return

  // 保存文件信息
  if (target === 'a') imgAFile.value = file
  else imgBFile.value = file

  const reader = new FileReader()
  reader.onload = () => {
    if (target === 'a') imgA.value = reader.result as string
    else imgB.value = reader.result as string
  }
  reader.readAsDataURL(file)
}
function clearImg(target: 'a' | 'b') {
  if (target === 'a') {
    imgA.value = ''
    imgAFile.value = null
  } else {
    imgB.value = ''
    imgBFile.value = null
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 滑动对比功能
function startDrag(e: MouseEvent) {
  e.preventDefault()
  isDragging.value = true

  // 禁止文本选择
  document.body.style.userSelect = 'none'
  document.body.style.webkitUserSelect = 'none'
  document.body.style.cursor = 'ew-resize'

  // 立即更新位置
  const container = (e.target as HTMLElement).closest('.relative')
  if (container) {
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    sliderPosition.value = Math.max(0, Math.min(100, (x / rect.width) * 100))
  }

  document.addEventListener('mousemove', onDrag, { passive: false })
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return
  e.preventDefault()
  e.stopPropagation()

  // 直接从页面获取滑块容器
  const container = document.querySelector('.slider-container')
  if (!container) return

  const rect = container.getBoundingClientRect()
  const x = e.clientX - rect.left
  sliderPosition.value = Math.max(0, Math.min(100, (x / rect.width) * 100))
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)

  // 恢复样式
  document.body.style.userSelect = ''
  document.body.style.webkitUserSelect = ''
  document.body.style.cursor = ''
}

const tabItems = computed(() => [
  { label: t('tools.diff.textDiff'), value: 'text' },
  { label: t('tools.diff.imageDiff'), value: 'image' },
])
const imageModeItems = computed(() => [
  { label: t('tools.diff.sideBySide'), value: 'side' },
  { label: t('tools.diff.overlay'), value: 'overlay' },
  { label: '滑动对比', value: 'slider' },
  { label: '差异高亮', value: 'difference' },
])

// 计算图片差异
const canvasRef = ref<HTMLCanvasElement | null>(null)
const diffImageUrl = ref('')
const diffThreshold = ref(10) // 差异阈值（0-255）

function computeDifference() {
  if (!imgA.value || !imgB.value || !canvasRef.value) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  const imgAElement = new Image()
  const imgBElement = new Image()

  imgAElement.src = imgA.value
  imgBElement.src = imgB.value

  Promise.all([
    new Promise((resolve) => { imgAElement.onload = resolve }),
    new Promise((resolve) => { imgBElement.onload = resolve }),
  ]).then(() => {
    const width = Math.max(imgAElement.width, imgBElement.width)
    const height = Math.max(imgAElement.height, imgBElement.height)

    canvas.width = width
    canvas.height = height

    // 绘制图片 A
    ctx.drawImage(imgAElement, 0, 0)
    const dataA = ctx.getImageData(0, 0, width, height)

    // 绘制图片 B
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(imgBElement, 0, 0)
    const dataB = ctx.getImageData(0, 0, width, height)

    // 计算差异
    const diff = ctx.createImageData(width, height)
    for (let i = 0; i < dataA.data.length; i += 4) {
      const rDiff = Math.abs(dataA.data[i]! - dataB.data[i]!)
      const gDiff = Math.abs(dataA.data[i + 1]! - dataB.data[i + 1]!)
      const bDiff = Math.abs(dataA.data[i + 2]! - dataB.data[i + 2]!)
      const avgDiff = (rDiff + gDiff + bDiff) / 3

      if (avgDiff > diffThreshold.value) {
        // 有差异：高亮显示（红色）
        diff.data[i] = 255
        diff.data[i + 1] = 0
        diff.data[i + 2] = 0
        diff.data[i + 3] = Math.min(255, avgDiff * 2)
      } else {
        // 无差异：显示灰度
        diff.data[i] = avgDiff
        diff.data[i + 1] = avgDiff
        diff.data[i + 2] = avgDiff
        diff.data[i + 3] = 255
      }
    }

    ctx.putImageData(diff, 0, 0)
    diffImageUrl.value = canvas.toDataURL()
  })
}

watch([imgA, imgB, imgMode], () => {
  if (imgMode.value === 'difference') {
    setTimeout(() => computeDifference(), 100)
  }
})

watch(diffThreshold, () => {
  if (imgMode.value === 'difference' && imgA.value && imgB.value) {
    computeDifference()
  }
})

onBeforeUnmount(() => {
  if (statsTimer) clearTimeout(statsTimer)
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
  <ToolPage name="diff" max-width="6xl" icon="i-lucide-git-compare-arrows">
    <ToolSection compact>
      <UTabs v-model="activeTab" :items="tabItems" />
    </ToolSection>

    <div v-if="activeTab === 'text'">
      <ToolSection :title="$t('tools.diff.textTitle')" :description="$t('tools.diff.textDesc')" :padding="false">
        <template #actions>
          <HistoryPanel
            :items="history.items.value"
            @select="onHistorySelect"
            @remove="history.remove"
            @clear="history.clear"
          />
          <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-upload" class="relative rounded-full">
            {{ $t('tools.diff.importOld') }}
            <input type="file" accept=".txt,.md,.json,.js,.ts,.vue,.html,.css" class="absolute inset-0 cursor-pointer opacity-0" @change="loadTextFile($event, 'old')" />
          </UButton>
          <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-upload" class="relative rounded-full">
            {{ $t('tools.diff.importNew') }}
            <input type="file" accept=".txt,.md,.json,.js,.ts,.vue,.html,.css" class="absolute inset-0 cursor-pointer opacity-0" @change="loadTextFile($event, 'new')" />
          </UButton>
          <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-x" class="rounded-full" :disabled="!oldText" @click="clearText('old')">{{ $t('tools.diff.clearOld') }}</UButton>
          <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-x" class="rounded-full" :disabled="!newText" @click="clearText('new')">{{ $t('tools.diff.clearNew') }}</UButton>
          <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-refresh-cw" class="rounded-full" @click="swap">{{ $t('tools.diff.swap') }}</UButton>
          <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-trash2" class="rounded-full" :disabled="!oldText && !newText" @click="clearAllText">{{ $t('tools.diff.clearAll') }}</UButton>
        </template>

        <div class="h-[600px] w-full overflow-hidden">
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
    </div>

    <div v-else>
      <ToolSection :title="$t('tools.diff.imageTitle')" :description="$t('tools.diff.imageDesc')">
        <template #actions>
          <UTabs v-model="imgMode" :items="imageModeItems" color="neutral" size="sm" />
          <USlider v-if="imgMode === 'overlay'" v-model="imgOpacity" :min="0" :max="100" :step="1" class="w-32" />
          <span v-if="imgMode === 'overlay'" class="text-xs text-muted">{{ imgOpacity }}%</span>
          <USlider v-if="imgMode === 'difference'" v-model="diffThreshold" :min="0" :max="100" :step="5" class="w-32" />
          <span v-if="imgMode === 'difference'" class="text-xs text-muted">灵敏度: {{ diffThreshold }}</span>
        </template>

        <div class="space-y-5">
          <div v-if="!imgA || !imgB" class="tool-control-grid">
            <div>
              <div class="mb-2 flex items-center justify-between">
                <span class="text-sm font-medium text-muted">{{ $t('tools.diff.imageA') }}</span>
                <UButton v-if="imgA" color="neutral" variant="ghost" icon="i-lucide-trash2" @click="clearImg('a')" class="rounded-full text-xs">{{ $t('app.clear') }}</UButton>
              </div>
              <FileDropZone v-if="!imgA" accept="image/*" :title="$t('tools.diff.uploadOrDropImage')" icon="i-lucide-image-up" ui-base="hig-subtle-surface rounded-[1.75rem] border border-dashed transition-colors hover:border-primary/40 hover:bg-primary/5 py-8" @files="onImgFiles($event, 'a')" />
              <div v-else class="hig-subtle-surface flex items-center justify-between rounded-[1.75rem] border px-4 py-8">
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium text-default">{{ imgAFile?.name || '图片 A' }}</div>
                  <div v-if="imgAFile" class="mt-1 text-xs text-muted">{{ formatFileSize(imgAFile.size) }}</div>
                </div>
                <UButton color="neutral" variant="ghost" @click="clearImg('a')" class="ml-3 shrink-0 rounded-full text-xs">{{ $t('app.clear') }}</UButton>
              </div>
            </div>
            <div>
              <div class="mb-2 flex items-center justify-between">
                <span class="text-sm font-medium text-muted">{{ $t('tools.diff.imageB') }}</span>
                <UButton v-if="imgB" color="neutral" variant="ghost" icon="i-lucide-trash2" @click="clearImg('b')" class="rounded-full text-xs">{{ $t('app.clear') }}</UButton>
              </div>
              <FileDropZone v-if="!imgB" accept="image/*" :title="$t('tools.diff.uploadOrDropImage')" icon="i-lucide-image-up" ui-base="hig-subtle-surface rounded-[1.75rem] border border-dashed transition-colors hover:border-primary/40 hover:bg-primary/5 py-8" @files="onImgFiles($event, 'b')" />
              <div v-else class="hig-subtle-surface flex items-center justify-between rounded-[1.75rem] border px-4 py-8">
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium text-default">{{ imgBFile?.name || '图片 B' }}</div>
                  <div v-if="imgBFile" class="mt-1 text-xs text-muted">{{ formatFileSize(imgBFile.size) }}</div>
                </div>
                <UButton color="neutral" variant="ghost" @click="clearImg('b')" class="ml-3 shrink-0 rounded-full text-xs">{{ $t('app.clear') }}</UButton>
              </div>
            </div>
          </div>

          <!-- 两张图片都上传后，显示紧凑的文件信息 -->
          <div v-else class="flex flex-wrap items-center gap-3 rounded-[1.75rem] border bg-elevated p-3">
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted">图片 A:</span>
              <span class="text-sm font-medium">{{ imgAFile?.name || '图片 A' }}</span>
              <span v-if="imgAFile" class="text-xs text-muted">{{ formatFileSize(imgAFile.size) }}</span>
              <UButton color="neutral" variant="ghost" icon="i-lucide-trash2" @click="clearImg('a')" size="xs" class="rounded-full" />
            </div>
            <div class="h-4 w-px bg-border"></div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted">图片 B:</span>
              <span class="text-sm font-medium">{{ imgBFile?.name || '图片 B' }}</span>
              <span v-if="imgBFile" class="text-xs text-muted">{{ formatFileSize(imgBFile.size) }}</span>
              <UButton color="neutral" variant="ghost" icon="i-lucide-trash2" @click="clearImg('b')" size="xs" class="rounded-full" />
            </div>
          </div>

          <!-- 预览区域 - 放大显示 -->
          <div v-if="imgA && imgB" class="mt-6">
            <div class="mb-3 text-sm font-medium text-muted">{{ $t('tools.diff.previewTitle') }}</div>

            <!-- 并排对比 -->
            <div v-if="imgMode === 'side'" class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="hig-subtle-surface flex items-center justify-center rounded-[1.75rem] border p-4">
                <img :src="imgA" class="max-h-[500px] max-w-full rounded-lg object-contain" :alt="$t('tools.diff.imageAPreviewAlt')" />
              </div>
              <div class="hig-subtle-surface flex items-center justify-center rounded-[1.75rem] border p-4">
                <img :src="imgB" class="max-h-[500px] max-w-full rounded-lg object-contain" :alt="$t('tools.diff.imageBPreviewAlt')" />
              </div>
            </div>

            <!-- 叠加对比 -->
            <div v-else-if="imgMode === 'overlay'" class="hig-subtle-surface relative flex min-h-[500px] items-center justify-center overflow-hidden rounded-[1.75rem] border p-4">
              <img :src="imgA" class="max-h-[500px] max-w-full rounded-lg object-contain" :alt="$t('tools.diff.imageAPreviewAlt')" />
              <img :src="imgB" class="absolute inset-0 m-auto max-h-[500px] max-w-full rounded-lg object-contain" :style="{ opacity: imgOpacity / 100 }" :alt="$t('tools.diff.imageBOverlayAlt')" />
            </div>

            <!-- 滑动对比 -->
            <div v-else-if="imgMode === 'slider'" class="hig-subtle-surface relative flex min-h-[500px] items-center justify-center overflow-hidden rounded-[1.75rem] border p-4">
              <div class="slider-container relative w-full max-w-full" style="user-select: none;">
                <img :src="imgB" class="max-h-[500px] w-full rounded-lg object-contain" :alt="$t('tools.diff.imageBPreviewAlt')" style="pointer-events: none;" />
                <div class="absolute inset-0 overflow-hidden" :style="{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }" style="pointer-events: none;">
                  <img :src="imgA" class="max-h-[500px] w-full rounded-lg object-contain" :alt="$t('tools.diff.imageAPreviewAlt')" />
                </div>
                <div
                  class="absolute inset-y-0 z-10 flex items-center justify-center"
                  :style="{ left: `calc(${sliderPosition}% - 20px)`, width: '40px' }"
                  style="touch-action: none;"
                >
                  <div
                    class="flex h-12 w-12 cursor-ew-resize items-center justify-center rounded-full bg-primary shadow-lg"
                    @mousedown="startDrag"
                  >
                    <UIcon name="i-lucide-grip-vertical" class="size-5 text-white" />
                  </div>
                  <div class="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-primary" style="pointer-events: none;"></div>
                </div>
              </div>
            </div>

            <!-- 差异高亮 -->
            <div v-else-if="imgMode === 'difference'" class="hig-subtle-surface flex min-h-[500px] items-center justify-center rounded-[1.75rem] border p-4">
              <img v-if="diffImageUrl" :src="diffImageUrl" class="max-h-[500px] max-w-full rounded-lg object-contain" alt="差异高亮" />
              <div v-else class="text-center text-sm text-muted">{{ $t('tools.diff.computingDifference') }}</div>
            </div>
          </div>
          <div v-else class="mt-6 rounded-[1.75rem] border border-dashed p-12 text-center text-sm text-muted">
            {{ $t('tools.diff.emptyPreview') }}
          </div>
        </div>
      </ToolSection>

      <!-- 隐藏的 canvas 用于计算差异 -->
      <canvas ref="canvasRef" class="hidden"></canvas>
    </div>
  </ToolPage>
</template>
