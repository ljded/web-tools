<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { useToolState } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
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

function onGenHistorySelect(item: { data: { text: string } }) { text.value = item.data.text }
function onParseHistorySelect(item: { data: { input: string } }) { parseInput.value = item.data.input }

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
      color: { dark: fgColor.value, light: bgColor.value },
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

watch([text, size, fgColor, bgColor], () => {
  if (activeTab.value === 'generate') debouncedGenerate()
}, { immediate: true })

watch(activeTab, (tab) => {
  if (tab === 'generate') nextTick(generate)
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

function decodeFromImageData(imageData: ImageData) {
  const code = jsQR(imageData.data, imageData.width, imageData.height)
  if (code) { parseResult.value = code.data; parseError.value = '' }
  else { parseResult.value = ''; parseError.value = '未识别到二维码，请尝试更换图片或调整裁剪区域' }
}

function handleParseFiles(files: File[]) {
  const file = files[0]
  if (file) parseImageFile(file)
}

function parseImageFile(file: File) {
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width; canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { parseError.value = '当前浏览器无法读取图片内容'; return }
      ctx.drawImage(img, 0, 0)
      decodeFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
    img.onerror = () => { parseError.value = '图片加载失败' }
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
    canvas.width = img.width; canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) { parseError.value = '当前浏览器无法读取图片内容'; return }
    ctx.drawImage(img, 0, 0)
    decodeFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height))
  }
  img.onerror = () => { parseError.value = '无法加载图片，请检查输入内容或尝试上传文件' }
  img.src = src.startsWith('data:') ? src : 'data:image/png;base64,' + src
}
</script>

<template>
  <ToolPage name="qrcode" max-width="3xl">
    <UTabs
      v-model="activeTab"
      :items="[
        { label: '生成二维码', value: 'generate', icon: 'i-lucide-qr-code' },
        { label: '解析二维码', value: 'parse', icon: 'i-lucide-scan-line' }
      ]"
    />

    <!-- 生成 -->
    <div v-if="activeTab === 'generate'" class="space-y-5">
      <ToolSection>
        <div class="space-y-5">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
                <UIcon name="i-lucide-file-image" class="size-3.5" /> 内容
              </label>
              <HistoryPanel :items="genHistory.items.value" @select="onGenHistorySelect" @remove="genHistory.remove" @clear="genHistory.clear" />
            </div>
            <UTextarea v-model="text" @blur="saveGenHistory" placeholder="输入网址或文本..." :rows="4" class="w-full" />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <UFormField :label="`尺寸: ${size}px`">
              <USlider v-model="size" :min="64" :max="1024" :step="16" />
            </UFormField>
            <UFormField label="前景">
              <UColorPicker v-model="fgColor" format="hex" size="sm" />
            </UFormField>
            <UFormField label="背景">
              <UColorPicker v-model="bgColor" format="hex" size="sm" />
            </UFormField>
          </div>

          <div class="flex items-center justify-center rounded-2xl bg-elevated p-6">
            <canvas ref="canvasRef" class="max-w-full" />
          </div>

          <UAlert v-if="genError" color="error" variant="soft" icon="i-lucide-circle-alert" :description="genError" />

          <UButton color="primary" icon="i-lucide-download" @click="download" class="rounded-full px-5 py-2.5 text-sm font-medium" :disabled="!text">下载 PNG</UButton>
        </div>
      </ToolSection>
    </div>

    <!-- 解析 -->
    <div v-if="activeTab === 'parse'" class="space-y-5">
      <ToolSection>
        <div class="space-y-5">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
                <UIcon name="i-lucide-file-image" class="size-3.5" /> 图片
              </label>
              <HistoryPanel :items="parseHistory.items.value" @select="onParseHistorySelect" @remove="parseHistory.remove" @clear="parseHistory.clear" />
            </div>
            <UTextarea v-model="parseInput" @blur="saveParseHistory" placeholder="粘贴图片 Base64 或 Data URL..." :rows="4" class="w-full" />
            <div>
              <UButton color="primary" variant="ghost" @click="parseFromInput" class="rounded-full text-sm">解析</UButton>
            </div>

            <FileDropZone
              accept="image/*"
              title="上传或拖拽二维码图片"
              hint="支持 PNG、JPG、WEBP 等常见图片格式"
              @files="handleParseFiles"
            />
          </div>

          <UAlert v-if="parseError" color="error" variant="soft" icon="i-lucide-circle-alert" :description="parseError" />

          <ResultPanel v-if="parseResult" title="解析结果" :value="parseResult" />
        </div>
      </ToolSection>
    </div>
  </ToolPage>
</template>
