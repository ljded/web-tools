<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToolState } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'
import { useRouteQueryValue } from '@/utils/routeQuery'

const { t } = useI18n()

const activeTab = usePersistedRef<'generate' | 'parse'>('web-tools:qrcode:tab', 'generate')
useRouteQueryValue('tab', activeTab, ['generate', 'parse'])

const tabItems = computed(() => [
  { label: t('tools.qrcode.generate'), value: 'generate', icon: 'i-lucide-qr-code' },
  { label: t('tools.qrcode.parse'), value: 'parse', icon: 'i-lucide-scan-line' },
])

const errorCorrectionItems = computed(() => [
  { label: t('tools.qrcode.ecl.low'), value: 'L' },
  { label: t('tools.qrcode.ecl.medium'), value: 'M' },
  { label: t('tools.qrcode.ecl.quartile'), value: 'Q' },
  { label: t('tools.qrcode.ecl.high'), value: 'H' },
])

const { input: text, history: genHistory, saveHistory: saveGenHistory } = useToolState<string, { text: string }>({
  storageKey: 'qrcode:gen',
  defaultInput: t('tools.qrcode.defaultText'),
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
  { label: t('tools.qrcode.metaChars'), value: text.value.length },
  { label: t('tools.qrcode.size'), value: `${size.value}px` },
  { label: t('tools.qrcode.errorCorrection'), value: errorCorrectionLevel.value },
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
    genError.value = e.message || t('tools.qrcode.generateFailed')
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

// Parse
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
    else { parseResult.value = ''; parseError.value = t('tools.qrcode.parseError') }
  } catch (e: any) {
    parseResult.value = ''
    parseError.value = e.message || t('tools.qrcode.parseFailed')
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
    parseError.value = t('tools.qrcode.imageReadFailed')
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
    if (!ctx) { parseLoading.value = false; parseError.value = t('tools.qrcode.imageReadUnsupported'); return }
    ctx.drawImage(img, 0, 0)
    await decodeFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height))
  }
  img.onerror = () => { parseLoading.value = false; parseError.value = t('tools.qrcode.imageLoadErrorUrl') }
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
      <UTabs v-model="activeTab" :items="tabItems" />

      <div v-if="activeTab === 'generate'" class="tool-workspace">
        <ToolSection :title="$t('tools.qrcode.generate')" :description="$t('tools.qrcode.generateDesc')">
          <template #actions>
            <HistoryPanel :items="genHistory.items.value" @select="onGenHistorySelect" @remove="genHistory.remove" @clear="genHistory.clear" />
          </template>

          <div class="space-y-5">
            <UFormField :label="$t('tools.qrcode.content')">
              <UTextarea v-model="text" @blur="saveGenHistory" :placeholder="$t('tools.qrcode.contentPlaceholder')" :rows="7" class="w-full" />
            </UFormField>

            <div class="hig-subtle-surface grid gap-4 rounded-2xl border p-4 sm:grid-cols-2">
              <UFormField :label="`${$t('tools.qrcode.size')}: ${size}px`">
                <USlider v-model="size" :min="64" :max="1024" :step="16" />
              </UFormField>
              <UFormField :label="`${$t('tools.qrcode.margin')}: ${margin}`">
                <USlider v-model="margin" :min="0" :max="8" :step="1" />
              </UFormField>
              <UFormField :label="$t('tools.qrcode.errorCorrection')">
                <USelect
                  v-model="errorCorrectionLevel"
                  :items="errorCorrectionItems"
                  class="w-full"
                />
              </UFormField>
              <div class="grid grid-cols-2 gap-3">
                <UFormField :label="$t('tools.qrcode.fgColor')">
                  <UColorPicker v-model="fgColor" format="hex" size="sm" />
                </UFormField>
                <UFormField :label="$t('tools.qrcode.bgColor')">
                  <UColorPicker v-model="bgColor" format="hex" size="sm" />
                </UFormField>
              </div>
            </div>

            <UAlert v-if="genError" color="error" variant="soft" icon="i-lucide-circle-alert" :description="genError" />
          </div>
        </ToolSection>

        <ResultPanel
          :title="$t('tools.qrcode.previewTitle')"
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
              <UButton color="primary" icon="i-lucide-download" class="rounded-full" :disabled="!text || genLoading" @click="downloadPng">{{ $t('tools.qrcode.downloadPng') }}</UButton>
              <UButton color="neutral" variant="soft" icon="i-lucide-file-code" class="rounded-full" :disabled="!text || genLoading" @click="downloadSvg">{{ $t('tools.qrcode.downloadSvg') }}</UButton>
            </div>
          </div>
        </ResultPanel>
      </div>

      <div v-if="activeTab === 'parse'" class="tool-workspace">
        <ToolSection :title="$t('tools.qrcode.parse')" :description="$t('tools.qrcode.parseDesc')">
          <template #actions>
            <HistoryPanel :items="parseHistory.items.value" @select="onParseHistorySelect" @remove="parseHistory.remove" @clear="parseHistory.clear" />
          </template>

          <div class="space-y-5">
            <UFormField :label="$t('tools.qrcode.parseInputLabel')">
              <UTextarea v-model="parseInput" @blur="saveParseHistory" :placeholder="$t('tools.qrcode.parsePlaceholder')" :rows="6" class="w-full" />
            </UFormField>

            <div class="flex flex-wrap gap-2">
              <UButton color="primary" icon="i-lucide-scan-line" class="rounded-full" :loading="parseLoading" :disabled="!parseInput.trim()" @click="parseFromInput">{{ $t('tools.qrcode.parseInputBtn') }}</UButton>
            </div>

            <FileDropZone
              accept="image/*"
              :title="$t('tools.qrcode.uploadTitle')"
              :hint="$t('tools.qrcode.uploadHint')"
              @files="handleParseFiles"
            />

            <UAlert v-if="parseError" color="error" variant="soft" icon="i-lucide-circle-alert" :description="parseError" />
          </div>
        </ToolSection>

        <div class="space-y-3 tool-preview-sticky">
          <div class="hig-panel rounded-[1.75rem] border p-4">
            <div class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{{ $t('tools.qrcode.imagePreview') }}</div>
            <div class="flex min-h-56 items-center justify-center rounded-2xl bg-elevated p-4">
              <img v-if="previewSrc" :src="previewSrc" :alt="$t('tools.qrcode.previewAlt')" class="max-h-72 max-w-full rounded-xl object-contain" />
              <div v-else class="text-sm text-muted">{{ $t('tools.qrcode.previewEmpty') }}</div>
            </div>
          </div>

          <ResultPanel :title="$t('tools.qrcode.parseResult')" :value="parseResult" :error="parseError" :loading="parseLoading" :empty-text="$t('tools.qrcode.emptyParseResult')" pre-wrap />
        </div>
      </div>
    </div>
  </ToolPage>
</template>
