<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { Download, RefreshCw, Upload, Copy, Check } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'
import { usePersistedRef } from '@/utils/persist'
import { useHistory } from '@/utils/history'
import HistoryPanel from '@/components/HistoryPanel.vue'

const activeTab = usePersistedRef<'generate' | 'parse'>('web-tools:qrcode:tab', 'generate')

const genHistory = useHistory<{ text: string }>('web-tools:qrcode:gen-history', {
  maxCount: 10,
  generateLabel: (d) => d.text.slice(0, 40) + (d.text.length > 40 ? '...' : ''),
})
const parseHistory = useHistory<{ input: string }>('web-tools:qrcode:parse-history', {
  maxCount: 10,
  generateLabel: (d) => d.input.slice(0, 40) + (d.input.length > 40 ? '...' : ''),
})

function saveGenHistory() {
  if (!text.value.trim()) return
  genHistory.add({ text: text.value })
}
function saveParseHistory() {
  if (!parseInput.value.trim()) return
  parseHistory.add({ input: parseInput.value })
}
function onGenHistorySelect(item: { data: { text: string } }) {
  text.value = item.data.text
}
function onParseHistorySelect(item: { data: { input: string } }) {
  parseInput.value = item.data.input
}

// 生成
const text = usePersistedRef('web-tools:qrcode:text', 'Web Tools - 本地离线工具集')
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
const parseInput = ref('')
const parseResult = ref('')
const parseError = ref('')
const parseCopied = ref(false)
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

async function copyParseResult() {
  if (!parseResult.value) return
  const ok = await copyToClipboard(parseResult.value)
  if (!ok) return
  parseCopied.value = true
  setTimeout(() => (parseCopied.value = false), 1500)
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <!-- 标签页 -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="t in ['generate', 'parse'] as const"
        :key="t"
        @click="activeTab = t"
        class="rounded-full px-4 py-2 text-sm font-medium transition-colors"
        :class="
          activeTab === t
            ? 'bg-primary text-on-primary'
            : 'bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80'
        "
      >
        {{ t === 'generate' ? '生成二维码' : '解析二维码' }}
      </button>
    </div>

    <!-- 生成 -->
    <div v-if="activeTab === 'generate'" class="space-y-6">
      <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
        <div class="mb-4 flex items-center justify-between">
          <label class="text-sm font-medium text-on-surface">内容</label>
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
          class="h-24 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label class="mb-1 block text-sm text-on-surface-variant">尺寸</label>
            <input
              v-model.number="size"
              type="number"
              min="64"
              max="1024"
              step="32"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-on-surface-variant">前景色</label>
            <div class="flex items-center gap-2">
              <input
                v-model="fgColor"
                type="color"
                class="h-10 w-10 cursor-pointer rounded-lg border border-outline bg-transparent p-1"
              />
              <input
                v-model="fgColor"
                type="text"
                class="h-10 flex-1 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm text-on-surface-variant">背景色</label>
            <div class="flex items-center gap-2">
              <input
                v-model="bgColor"
                type="color"
                class="h-10 w-10 cursor-pointer rounded-lg border border-outline bg-transparent p-1"
              />
              <input
                v-model="bgColor"
                type="text"
                class="h-10 flex-1 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        <div v-if="genError" class="mt-3 text-xs text-error">{{ genError }}</div>
      </div>

      <div
        class="flex flex-col items-center rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant"
      >
        <canvas ref="canvasRef" class="rounded-xl" />
        <div class="mt-4 flex gap-3">
          <button
            @click="generate"
            class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors"
          >
            <RefreshCw class="h-4 w-4" />
            刷新
          </button>
          <button
            @click="download"
            class="flex items-center gap-2 rounded-full bg-secondary-container px-5 py-2.5 text-sm font-medium text-on-secondary-container hover:bg-secondary-container/80 transition-colors"
          >
            <Download class="h-4 w-4" />
            下载 PNG
          </button>
        </div>
      </div>
    </div>

    <!-- 解析 -->
    <div v-else class="space-y-6">
      <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <button
              @click="triggerParseFile"
              class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Upload class="h-4 w-4" />
              上传图片
            </button>
            <input ref="parseFileInput" type="file" accept="image/*" class="hidden" @change="handleParseFile" />
            <span class="text-xs text-on-surface-variant">或粘贴 Base64 / Data URL</span>
          </div>
          <HistoryPanel
            :items="parseHistory.items.value"
            @select="onParseHistorySelect"
            @remove="parseHistory.remove"
            @clear="parseHistory.clear"
          />
        </div>

        <textarea
          v-model="parseInput"
          @blur="saveParseHistory"
          placeholder="粘贴图片 Base64 或 Data URL..."
          class="h-32 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        <button
          @click="parseFromInput"
          class="flex items-center gap-2 rounded-full bg-secondary-container px-5 py-2.5 text-sm font-medium text-on-secondary-container hover:bg-secondary-container/80 transition-colors"
        >
          解析
        </button>

        <div v-if="parseError" class="text-sm text-error">{{ parseError }}</div>

        <div v-if="parseResult" class="rounded-xl bg-surface-variant/50 p-4">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs font-medium text-on-surface-variant">解析结果</span>
            <button
              @click="copyParseResult"
              class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
            >
              <Check v-if="parseCopied" class="h-3.5 w-3.5" />
              <Copy v-else class="h-3.5 w-3.5" />
              {{ parseCopied ? '已复制' : '复制' }}
            </button>
          </div>
          <div class="break-all font-mono text-sm text-on-surface">{{ parseResult }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
