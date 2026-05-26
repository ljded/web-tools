<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
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
  getHistoryData: (value) => ({ text: value }),
  historyOptions: {
    maxCount: 10,
    generateLabel: (d) => d.text.slice(0, 40) + (d.text.length > 40 ? '...' : ''),
  },
})

const { input: parseInput, history: parseHistory, saveHistory: saveParseHistory } = useToolState<string, { input: string }>({
  storageKey: 'qrcode:parse',
  defaultInput: '',
  getHistoryData: (value) => ({ input: value }),
  historyOptions: {
    maxCount: 10,
    generateLabel: (d) => d.input.slice(0, 40) + (d.input.length > 40 ? '...' : ''),
  },
})

function onGenHistorySelect(item: { data: { text: string } }) { text.value = item.data.text }
function onParseHistorySelect(item: { data: { input: string } }) { parseInput.value = item.data.input }

const size = usePersistedRef('web-tools:qrcode:size', 256)
const margin = usePersistedRef('web-tools:qrcode:margin', 2)
const errorCorrectionLevel = usePersistedRef<'L' | 'M' | 'Q' | 'H'>('web-tools:qrcode:ecl', 'M')
const fgColor = usePersistedRef('web-tools:qrcode:fg', '#000000')
const bgColor = usePersistedRef('web-tools:qrcode:bg', '#ffffff')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const genError = ref('')
const genLoading = ref(false)
let generateTimer: ReturnType<typeof setTimeout> | null = null
let generateSeq = 0

const generateMeta = computed(() => [
  { label: '字符', value: text.value.length },
  { label: '尺寸', value: `${size.value}px` },
  { label: '纠错', value: errorCorrectionLevel.value },
])

async function generate() {
  if (!canvasRef.value) return
  const seq = ++generateSeq
  genError.value = ''
  genLoading.value = true
  try {
    const safeSize = Math.min(Math.max(Number(size.value) || 256, 64), 1024)
    const safeMargin = Math.min(Math.max(Number(margin.value) || 0, 0), 8)
    size.value = safeSize
    margin.value = safeMargin
    const { default: QRCode } = await import('qrcode')
    await QRCode.toCanvas(canvasRef.value, text.value || ' ', {
      width: safeSize,
      margin: safeMargin,
      errorCorrectionLevel: errorCorrectionLevel.value,
      color: { dark: fgColor.value, light: bgColor.value },
    })
  } catch (e: any) {
    if (seq !== generateSeq) return
    genError.value = e.message || '生成失败'
  } finally {
    if (seq === generateSeq) genLoading.value = false
  }
}

function debouncedGenerate() {
  if (generateTimer) clearTimeout(generateTimer)
  generateTimer = setTimeout(() => nextTick(generate), 180)
}

watch([text, size, margin, errorCorrectionLevel, fgColor, bgColor], () => {
  if (activeTab.value === 'generate') debouncedGenerate()
}, { immediate: true })

watch(activeTab, (tab) => {
  if (tab === 'generate') nextTick(generate)
})

async function downloadPng() {
  if (!canvasRef.value) return
  const link = document.createElement('a')
  link.download = 'qrcode.png'
  link.href = canvasRef.value.toDataURL('image/png')
  link.click()
}

async function downloadSvg() {
  const { default: QRCode } = await import('qrcode')
  const safeMargin = Math.min(Math.max(Number(margin.value) || 0, 0), 8)
  const svg = await QRCode.toString(text.value || ' ', {
    type: 'svg',
    margin: safeMargin,
    errorCorrectionLevel: errorCorrectionLevel.value,
    color: { dark: fgColor.value, light: bgColor.value },
  })
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = 'qrcode.svg'
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

// 解析
const parseResult = ref('')
const parseError = ref('')
const parseLoading = ref(false)
const previewSrc = ref('')

async function decodeFromImageData(imageData: ImageData) {
  parseLoading.value = true
  parseError.value = ''
  try {
    const { default: jsQR } = await import('jsqr')
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    if (code) { parseResult.value = code.data; parseError.value = '' }
    else { parseResult.value = ''; parseError.value = '未识别到二维码，请尝试更换图片或调整裁剪区域' }
  } catch (e: any) {
    parseResult.value = ''
    parseError.value = e.message || '解析失败'
  } finally {
    parseLoading.value = false
  }
}

function handleParseFiles(files: File[]) {
  const file = files[0]
  if (file) parseImageFile(file)
}

function parseImageFile(file: File) {
  if (!file) return
  parseLoading.value = true
  parseError.value = ''
  parseResult.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    const src = reader.result as string
    previewSrc.value = src
    decodeImageSource(src)
  }
  reader.onerror = () => {
    parseLoading.value = false
    parseError.value = '图片读取失败'
  }
  reader.readAsDataURL(file)
}

function decodeImageSource(src: string) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width; canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) { parseLoading.value = false; parseError.value = '当前浏览器无法读取图片内容'; return }
    ctx.drawImage(img, 0, 0)
    await decodeFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height))
  }
  img.onerror = () => { parseLoading.value = false; parseError.value = '无法加载图片，请检查输入内容或尝试上传文件' }
  img.src = src
}

function parseFromInput() {
  const src = parseInput.value.trim()
  if (!src) return
  parseLoading.value = true
  parseError.value = ''
  parseResult.value = ''
  const imageSrc = src.startsWith('data:') ? src : 'data:image/png;base64,' + src
  previewSrc.value = imageSrc
  decodeImageSource(imageSrc)
}
</script>

<template>
  <ToolPage name="qrcode" max-width="6xl">
    <div class="space-y-4">
      <UTabs
        v-model="activeTab"
        :items="[
          { label: '生成二维码', value: 'generate', icon: 'i-lucide-qr-code' },
          { label: '解析二维码', value: 'parse', icon: 'i-lucide-scan-line' }
        ]"
      />

      <div v-if="activeTab === 'generate'" class="tool-workspace">
        <ToolSection title="生成二维码" description="输入文本并调整尺寸、留白、纠错等级和颜色。">
          <template #actions>
            <HistoryPanel :items="genHistory.items.value" @select="onGenHistorySelect" @remove="genHistory.remove" @clear="genHistory.clear" />
          </template>

          <div class="space-y-5">
            <UFormField label="内容">
              <UTextarea v-model="text" @blur="saveGenHistory" placeholder="输入网址或文本..." :rows="7" class="w-full" />
            </UFormField>

            <div class="hig-subtle-surface grid gap-4 rounded-2xl border p-4 sm:grid-cols-2">
              <UFormField :label="`尺寸: ${size}px`">
                <USlider v-model="size" :min="64" :max="1024" :step="16" />
              </UFormField>
              <UFormField :label="`留白: ${margin}`">
                <USlider v-model="margin" :min="0" :max="8" :step="1" />
              </UFormField>
              <UFormField label="纠错等级">
                <USelect
                  v-model="errorCorrectionLevel"
                  :items="[
                    { label: '低 L', value: 'L' },
                    { label: '中 M', value: 'M' },
                    { label: '较高 Q', value: 'Q' },
                    { label: '高 H', value: 'H' }
                  ]"
                  class="w-full"
                />
              </UFormField>
              <div class="grid grid-cols-2 gap-3">
                <UFormField label="前景">
                  <UColorPicker v-model="fgColor" format="hex" size="sm" />
                </UFormField>
                <UFormField label="背景">
                  <UColorPicker v-model="bgColor" format="hex" size="sm" />
                </UFormField>
              </div>
            </div>

            <UAlert v-if="genError" color="error" variant="soft" icon="i-lucide-circle-alert" :description="genError" />
          </div>
        </ToolSection>

        <ResultPanel
          title="二维码预览"
          :value="text"
          :meta="generateMeta"
          :copyable="false"
          :loading="genLoading"
          class="tool-preview-sticky"
        >
          <div class="flex flex-col items-center gap-4">
            <div class="rounded-[1.75rem] bg-white p-5 shadow-inner shadow-default/10">
              <canvas ref="canvasRef" class="max-w-full" />
            </div>
            <div class="flex flex-wrap justify-center gap-2">
              <UButton color="primary" icon="i-lucide-download" class="rounded-full" :disabled="!text || genLoading" @click="downloadPng">下载 PNG</UButton>
              <UButton color="neutral" variant="soft" icon="i-lucide-file-code" class="rounded-full" :disabled="!text || genLoading" @click="downloadSvg">下载 SVG</UButton>
            </div>
          </div>
        </ResultPanel>
      </div>

      <div v-if="activeTab === 'parse'" class="tool-workspace">
        <ToolSection title="解析二维码" description="上传图片或粘贴 Base64 / Data URL，在本地识别二维码内容。">
          <template #actions>
            <HistoryPanel :items="parseHistory.items.value" @select="onParseHistorySelect" @remove="parseHistory.remove" @clear="parseHistory.clear" />
          </template>

          <div class="space-y-5">
            <UFormField label="图片 Base64 / Data URL">
              <UTextarea v-model="parseInput" @blur="saveParseHistory" placeholder="粘贴图片 Base64 或 Data URL..." :rows="6" class="w-full" />
            </UFormField>

            <div class="flex flex-wrap gap-2">
              <UButton color="primary" icon="i-lucide-scan-line" class="rounded-full" :loading="parseLoading" :disabled="!parseInput.trim()" @click="parseFromInput">解析输入</UButton>
            </div>

            <FileDropZone
              accept="image/*"
              title="上传或拖拽二维码图片"
              hint="支持 PNG、JPG、WEBP 等常见图片格式"
              @files="handleParseFiles"
            />

            <UAlert v-if="parseError" color="error" variant="soft" icon="i-lucide-circle-alert" :description="parseError" />
          </div>
        </ToolSection>

        <div class="space-y-3 tool-preview-sticky">
          <div class="hig-panel rounded-[1.75rem] border p-4">
            <div class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">图片预览</div>
            <div class="flex min-h-56 items-center justify-center rounded-2xl bg-elevated p-4">
              <img v-if="previewSrc" :src="previewSrc" alt="二维码预览" class="max-h-72 max-w-full rounded-xl object-contain" />
              <div v-else class="text-sm text-muted">上传或粘贴图片后显示预览</div>
            </div>
          </div>

          <ResultPanel title="解析结果" :value="parseResult" :error="parseError" :loading="parseLoading" empty-text="等待解析二维码..." pre-wrap />
        </div>
      </div>
    </div>
  </ToolPage>
</template>
