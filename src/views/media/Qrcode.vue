<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import {
  Download,
  RefreshCw,
  Upload,
  QrCode,
  ScanLine,
  FileImage,
} from '@lucide/vue'
import { useToolState, useClipboard } from '@/composables'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolHeader from '@/components/ToolHeader.vue'
import ToolCard from '@/components/ToolCard.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'
import CopyBtn from '@/components/CopyBtn.vue'
import { usePersistedRef } from '@/utils/persist'

const activeTab = usePersistedRef<'generate' | 'parse'>('web-tools:qrcode:tab', 'generate')

const { input: text, history: genHistory, saveHistory: saveGenHistory } = useToolState<string, { text: string }>({
  storageKey: 'qrcode:gen',
  defaultInput: 'Web Tools - 本地离线工具集',
  historyOptions: {
    maxCount: 10,
    generateLabel: (d) => d.text.slice(0, 40) + (d.text.length > 40 ? '...' : ''),
  },
})

const { input: parseInput, history: parseHistory, saveHistory: saveParseHistory } = useToolState<string, { input: string }>({
  storageKey: 'qrcode:parse',
  defaultInput: '',
  historyOptions: {
    maxCount: 10,
    generateLabel: (d) => d.input.slice(0, 40) + (d.input.length > 40 ? '...' : ''),
  },
})

function onGenHistorySelect(item: { data: { text: string } }) {
  text.value = item.data.text
}
function onParseHistorySelect(item: { data: { input: string } }) {
  parseInput.value = item.data.input
}

const size = usePersistedRef('web-tools:qrcode:size', 256)
const fgColor = usePersistedRef('web-tools:qrcode:fg', '#000000')
const bgColor = usePersistedRef('web-tools:qrcode:bg', '#ffffff')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const genError = ref('')
let generateTimer: ReturnType<typeof setTimeout> | null = null
let generateSeq = 0

async function generate() {
  if (!canvasRef.value) return
  const seq = ++generateSeq
  genError.value = ''
  try {
    const safeSize = Math.min(Math.max(Number(size.value) || 256, 64), 1024)
    size.value = safeSize
    await QRCode.toCanvas(canvasRef.value, text.value || ' ', {
      width: safeSize,
      margin: 2,
      color: {
        dark: fgColor.value,
        light: bgColor.value,
      },
    })
  } catch (e: any) {
    if (seq !== generateSeq) return
    genError.value = e.message || '生成失败'
  }
}

function debouncedGenerate() {
  if (generateTimer) clearTimeout(generateTimer)
  generateTimer = setTimeout(() => nextTick(generate), 180)
}

watch(
  [text, size, fgColor, bgColor],
  () => {
    if (activeTab.value === 'generate') debouncedGenerate()
  },
  { immediate: true },
)

watch(activeTab, (tab) => {
  if (tab === 'generate') {
    nextTick(generate)
  }
})

function download() {
  if (!canvasRef.value) return
  const link = document.createElement('a')
  link.download = 'qrcode.png'
  link.href = canvasRef.value.toDataURL('image/png')
  link.click()
}

// 解析
const parseResult = ref('')
const parseError = ref('')
const parseFileInput = ref<HTMLInputElement | null>(null)

function triggerParseFile() {
  if (parseFileInput.value) parseFileInput.value.value = ''
  parseFileInput.value?.click()
}

function decodeFromImageData(imageData: ImageData) {
  const code = jsQR(imageData.data, imageData.width, imageData.height)
  if (code) {
    parseResult.value = code.data
    parseError.value = ''
  } else {
    parseResult.value = ''
    parseError.value = '未识别到二维码，请尝试更换图片或调整裁剪区域'
  }
}

function handleParseFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) parseImageFile(file)
}

function parseImageFile(file: File) {
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      decodeFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
    img.onerror = () => {
      parseError.value = '图片加载失败'
    }
    img.src = reader.result as string
  }
  reader.readAsDataURL(file)
}

function handleParseDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) parseImageFile(file)
}

function parseFromInput() {
  const src = parseInput.value.trim()
  if (!src) return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    decodeFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height))
  }
  img.onerror = () => {
    parseError.value = '无法加载图片，请检查输入内容或尝试上传文件'
  }
  img.src = src.startsWith('data:') ? src : 'data:image/png;base64,' + src
}

const tabsConfig = [
  { key: 'generate' as const, label: '生成二维码', icon: QrCode },
  { key: 'parse' as const, label: '解析二维码', icon: ScanLine },
] as const
</script>

<template>
  <ToolLayout max-width="3xl">
    <ToolHeader
      title="二维码工具"
      description="生成与解析二维码图片"
      :icon="QrCode"
    />

    <!-- Elegant Segmented Tab Bar -->
    <div class="flex justify-center">
      <div class="inline-flex items-center gap-1 rounded-2xl bg-surface p-1.5 shadow-sm outline outline-1 outline-outline-variant">
        <button
          v-for="t in tabsConfig"
          :key="t.key"
          @click="activeTab = t.key"
          class="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200"
          :class="activeTab === t.key
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:bg-surface-variant/60 hover:text-on-surface'
          "
        >
          <component :is="t.icon" class="h-4 w-4" />
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- 生成 -->
    <div v-if="activeTab === 'generate'" class="space-y-5">
      <ToolCard>
        <div class="space-y-5">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                <FileImage class="h-3.5 w-3.5" />
                内容
              </label>
              <HistoryPanel
                :items="genHistory.items.value"
                @select="onGenHistorySelect"
                @remove="genHistory.remove"
                @clear="genHistory.clear"
              />
            </div>
            <textarea
              v-model="text"
              @blur="saveGenHistory"
              placeholder="输入网址或文本..."
              class="h-32 w-full resize-none rounded-xl border border-outline bg-surface-variant/40 p-4 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/50 focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">尺寸</label>
              <input
                v-model.number="size"
                type="number"
                min="64"
                max="1024"
                step="32"
                class="h-11 w-full rounded-xl border border-outline bg-surface-variant/40 px-4 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/50 focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">前景色</label>
              <div class="flex items-center gap-2">
                <input v-model="fgColor" type="color" class="h-11 w-11 cursor-pointer rounded-xl border border-outline bg-transparent p-1" />
                <input v-model="fgColor" type="text" class="h-11 flex-1 rounded-xl border border-outline bg-surface-variant/40 px-4 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/50 focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10" />
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">背景色</label>
              <div class="flex items-center gap-2">
                <input v-model="bgColor" type="color" class="h-11 w-11 cursor-pointer rounded-xl border border-outline bg-transparent p-1" />
                <input v-model="bgColor" type="text" class="h-11 flex-1 rounded-xl border border-outline bg-surface-variant/40 px-4 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/50 focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10" />
              </div>
            </div>
          </div>

          <div v-if="genError" class="flex items-center gap-2 rounded-xl bg-error-container/60 px-4 py-3 text-sm text-on-error-container">
            <AlertCircle class="h-4 w-4 shrink-0" />
            {{ genError }}
          </div>
        </div>
      </ToolCard>

      <ToolCard>
        <div class="flex flex-col items-center p-6">
          <canvas ref="canvasRef" class="rounded-xl" />
          <div class="mt-5 flex gap-3">
            <button
              @click="generate"
              class="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm transition-all hover:bg-primary/90 hover:shadow"
            >
              <RefreshCw class="h-4 w-4" />
              刷新
            </button>
            <button
              @click="download"
              class="flex items-center gap-2 rounded-xl bg-secondary-container px-5 py-2.5 text-sm font-medium text-on-secondary-container shadow-sm transition-all hover:bg-secondary-container/80 hover:shadow"
            >
              <Download class="h-4 w-4" />
              下载 PNG
            </button>
          </div>
        </div>
      </ToolCard>
    </div>

    <!-- 解析 -->
    <div v-else class="space-y-5">
      <ToolCard>
        <div class="space-y-5">
          <div
            class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-outline p-4 transition-colors hover:border-primary hover:bg-primary-container/20"
            @dragover.prevent
            @drop="handleParseDrop"
          >
            <div class="flex items-center gap-3">
              <button
                @click="triggerParseFile"
                class="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm transition-all hover:bg-primary/90 hover:shadow"
              >
                <Upload class="h-4 w-4" />
                上传图片
              </button>
              <input ref="parseFileInput" type="file" accept="image/*" class="hidden" @change="handleParseFile" />
              <span class="text-xs text-on-surface-variant">或拖拽图片 / 粘贴 Base64 / Data URL</span>
            </div>
            <HistoryPanel
              :items="parseHistory.items.value"
              @select="onParseHistorySelect"
              @remove="parseHistory.remove"
              @clear="parseHistory.clear"
            />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">输入</label>
            <textarea
              v-model="parseInput"
              @blur="saveParseHistory"
              placeholder="粘贴图片 Base64 或 Data URL..."
              class="h-32 w-full resize-none rounded-xl border border-outline bg-surface-variant/40 p-4 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/50 focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <button
            @click="parseFromInput"
            class="flex items-center gap-2 rounded-xl bg-secondary-container px-5 py-2.5 text-sm font-medium text-on-secondary-container shadow-sm transition-all hover:bg-secondary-container/80 hover:shadow"
          >
            <ScanLine class="h-4 w-4" />
            解析
          </button>

          <div v-if="parseError" class="flex items-center gap-2 rounded-xl bg-error-container/60 px-4 py-3 text-sm text-on-error-container">
            <AlertCircle class="h-4 w-4 shrink-0" />
            {{ parseError }}
          </div>

          <div v-if="parseResult" class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">解析结果</label>
              <CopyBtn :text="parseResult" variant="button" />
            </div>
            <div class="break-all rounded-xl bg-primary-container/40 p-4 font-mono text-sm text-on-primary-container">
              {{ parseResult }}
            </div>
          </div>
        </div>
      </ToolCard>
    </div>
  </ToolLayout>
</template>
