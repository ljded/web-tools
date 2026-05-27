<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePersistedRef } from '@/utils/persist'
import { useRouteQueryValue } from '@/utils/routeQuery'
import PdfWorker from '@/workers/pdf.worker?worker'
import { createWorkerPool } from '@/workers/pool'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'

const { t } = useI18n()
const toast = useToast()
const pdfWorkerPool = createWorkerPool(() => new PdfWorker(), { size: 1 })
const MAX_PDF_BYTES = 100 * 1024 * 1024
const MAX_TO_IMAGE_PAGES = 30
const MAX_TO_IMAGE_DPI = 300

const activeTab = usePersistedRef<'compress' | 'merge' | 'split' | 'watermark' | 'toImage'>('web-tools:pdf:tab', 'compress')
useRouteQueryValue('tab', activeTab, ['compress', 'merge', 'split', 'watermark', 'toImage'])

// PDF compression
const compressFile = ref<File | null>(null)
const compressLevel = usePersistedRef<'light' | 'medium' | 'strong'>('web-tools:pdf:compress-level', 'medium')
const compressLoading = ref(false)

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
function canUsePdf(file: File): boolean {
  if (!isPdfFile(file)) return false
  if (file.size <= MAX_PDF_BYTES) return true
  toast.add({ title: t('tools.pdf.fileTooLargeTitle'), description: t('tools.pdf.fileTooLargeDesc'), color: 'warning' })
  return false
}
function localizePdfError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  if (message === '__pdf_error:page_range') return t('tools.pdf.pageRangeError')
  if (message.startsWith('__pdf_error:')) return t('app.error')
  return message || t('app.error')
}
function setCompressFile(file: File) {
  if (canUsePdf(file)) compressFile.value = file
}
function onCompressFiles(files: File[]) {
  const [file] = files
  if (file) setCompressFile(file)
}

async function doCompress() {
  if (!compressFile.value) return
  compressLoading.value = true
  const lease = await pdfWorkerPool.acquire()
  try {
    const bytes = await compressFile.value.arrayBuffer()
    const out = await lease.send<ArrayBuffer>({ type: 'compress', bytes, level: compressLevel.value }, { transfer: [bytes], timeout: 0 })
    const baseName = compressFile.value.name.replace(/\.pdf$/i, '') || 'document'
    downloadBlob(pdfBytesToBlob(out), `${baseName}_compressed.pdf`)
  } catch (e: any) { toast.add({ title: t('tools.pdf.alertCompressFail'), description: localizePdfError(e), color: 'error' }) }
  finally { lease.release(); compressLoading.value = false }
}

// PDF merge
const mergeFiles = ref<{ file: File; name: string }[]>([])
const mergeLoading = ref(false)

function addMergeFiles(files: File[]) {
  const valid = files.filter(canUsePdf)
  mergeFiles.value.push(...valid.map((f) => ({ file: f, name: f.name })))
}
function removeMergeFile(idx: number) { mergeFiles.value.splice(idx, 1) }
function moveMergeFile(idx: number, dir: -1 | 1) {
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= mergeFiles.value.length) return
  const temp = mergeFiles.value[idx]; mergeFiles.value[idx] = mergeFiles.value[newIdx]!; mergeFiles.value[newIdx] = temp!
}

async function doMerge() {
  if (!mergeFiles.value.length) return
  mergeLoading.value = true
  const lease = await pdfWorkerPool.acquire()
  try {
    const files = await Promise.all(mergeFiles.value.map((item) => item.file.arrayBuffer()))
    const bytes = await lease.send<ArrayBuffer>({ type: 'merge', files }, { transfer: files, timeout: 0 })
    downloadBlob(pdfBytesToBlob(bytes), 'merged.pdf')
  } catch (e: any) { toast.add({ title: t('tools.pdf.alertMergeFail'), description: localizePdfError(e), color: 'error' }) }
  finally { lease.release(); mergeLoading.value = false }
}

// PDF split
const splitFile = ref<File | null>(null)
const splitRanges = usePersistedRef('web-tools:pdf:split-ranges', '1-3,5')
const splitLoading = ref(false)

function setSplitFile(file: File) { if (canUsePdf(file)) splitFile.value = file }
function onSplitFiles(files: File[]) {
  const [file] = files
  if (file) setSplitFile(file)
}

async function doSplit() {
  if (!splitFile.value) return
  splitLoading.value = true
  const lease = await pdfWorkerPool.acquire()
  try {
    const bytes = await splitFile.value.arrayBuffer()
    const files = await lease.send<Array<{ name: string; bytes: ArrayBuffer }>>({ type: 'split', bytes, ranges: splitRanges.value }, { transfer: [bytes], timeout: 0 })
    for (const file of files) {
      downloadBlob(pdfBytesToBlob(file.bytes), file.name)
    }
  } catch (e: any) { toast.add({ title: t('tools.pdf.alertSplitFail'), description: localizePdfError(e), color: 'error' }) }
  finally { lease.release(); splitLoading.value = false }
}

// PDF watermark
const wmFile = ref<File | null>(null)
const wmText = usePersistedRef('web-tools:pdf:wm-text', 'CONFIDENTIAL')
const wmColor = usePersistedRef('web-tools:pdf:wm-color', '#ff0000')
const wmSize = usePersistedRef('web-tools:pdf:wm-size', 48)
const wmLoading = ref(false)

function setWmFile(file: File) { if (canUsePdf(file)) wmFile.value = file }
function onWmFiles(files: File[]) {
  const [file] = files
  if (file) setWmFile(file)
}

async function doWatermark() {
  if (!wmFile.value) return
  wmLoading.value = true
  const lease = await pdfWorkerPool.acquire()
  try {
    const bytes = await wmFile.value.arrayBuffer()
    const out = await lease.send<ArrayBuffer>({ type: 'watermark', bytes, text: wmText.value, color: wmColor.value, size: wmSize.value }, { transfer: [bytes], timeout: 0 })
    downloadBlob(pdfBytesToBlob(out), 'watermarked.pdf')
  } catch (e: any) { toast.add({ title: t('tools.pdf.alertWmFail'), description: localizePdfError(e), color: 'error' }) }
  finally { lease.release(); wmLoading.value = false }
}

// PDF to image
const tiFile = ref<File | null>(null)
const tiDpi = usePersistedRef('web-tools:pdf:ti-dpi', 150)
const tiLoading = ref(false)
const tiResults = ref<{ url: string; idx: number }[]>([])
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.mjs?url'),
    ]).then(([pdfjs, workerUrl]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default
      return pdfjs
    })
  }
  return pdfjsPromise
}

function clearTiResults() {
  tiResults.value.forEach((r) => URL.revokeObjectURL(r.url))
  tiResults.value = []
}
function setTiFile(file: File) {
  if (!canUsePdf(file)) return
  tiFile.value = file
  clearTiResults()
}
function onTiFiles(files: File[]) {
  const [file] = files
  if (file) setTiFile(file)
}

async function doToImage() {
  if (!tiFile.value) return
  tiLoading.value = true
  try {
    const bytes = await tiFile.value.arrayBuffer()
    const pdfjsLib = await loadPdfjs()
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
    if (pdf.numPages > MAX_TO_IMAGE_PAGES) {
      toast.add({ title: t('tools.pdf.pageTooManyTitle'), description: t('tools.pdf.pageTooManyDesc', { count: MAX_TO_IMAGE_PAGES }), color: 'warning' })
      return
    }
    const dpi = Math.min(tiDpi.value, MAX_TO_IMAGE_DPI)
    const scale = dpi / 72
    const results: { url: string; idx: number }[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width; canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(t('tools.pdf.imageExportFailed')))), 'image/png')
      })
      results.push({ url: URL.createObjectURL(blob), idx: i })
    }
    clearTiResults()
    tiResults.value = results
  } catch (e: any) { toast.add({ title: t('tools.pdf.alertConvertFail'), description: localizePdfError(e), color: 'error' }) }
  finally { tiLoading.value = false }
}

onUnmounted(() => {
  clearTiResults()
  pdfWorkerPool.terminate()
})

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.download = filename; link.href = url; link.click()
  URL.revokeObjectURL(url)
}
function pdfBytesToBlob(bytes: ArrayBuffer | Uint8Array) {
  const buffer = bytes instanceof Uint8Array ? bytes.slice().buffer : bytes
  return new Blob([buffer], { type: 'application/pdf' })
}

const tabItems = computed(() => [
  { value: 'compress' as const, label: t('tools.pdf.compress'), icon: 'i-lucide-minimize-2' },
  { value: 'merge' as const, label: t('tools.pdf.merge'), icon: 'i-lucide-merge' },
  { value: 'split' as const, label: t('tools.pdf.split'), icon: 'i-lucide-scissors' },
  { value: 'watermark' as const, label: t('tools.pdf.watermark'), icon: 'i-lucide-type' },
  { value: 'toImage' as const, label: t('tools.pdf.toImage'), icon: 'i-lucide-image' },
])
const compressionLevelItems = computed(() => [
  { label: t('tools.pdf.light'), value: 'light' },
  { label: t('tools.pdf.medium'), value: 'medium' },
  { label: t('tools.pdf.strong'), value: 'strong' },
])
const activeTabLabel = computed(() => tabItems.value.find((item) => item.value === activeTab.value)?.label)
const currentFileStatus = computed(() => {
  if (activeTab.value === 'merge') return t('tools.pdf.mergeQueue', { count: mergeFiles.value.length })
  const file = activeTab.value === 'compress'
    ? compressFile.value
    : activeTab.value === 'split'
      ? splitFile.value
      : activeTab.value === 'watermark'
        ? wmFile.value
        : tiFile.value
  return file?.name || t('tools.pdf.waitingFile')
})
</script>

<template>
  <ToolPage name="pdf" max-width="6xl">
    <ToolSection compact>
      <UTabs v-model="activeTab" :items="tabItems" />
    </ToolSection>

    <div class="tool-workspace">
      <div class="space-y-4">
        <ToolSection v-if="activeTab === 'compress'" :title="$t('tools.pdf.compressTitle')" :description="$t('tools.pdf.compressDesc')">
          <div class="space-y-5">
            <FileDropZone accept=".pdf" :title="$t('tools.pdf.selectPdf')" :hint="$t('tools.pdf.dropHint')" @files="onCompressFiles" />
            <div class="tool-control-grid">
              <UFormField :label="$t('tools.pdf.compressionLevel')">
                <USelect v-model="compressLevel" :items="compressionLevelItems" class="w-full" />
              </UFormField>
            </div>
            <div class="tool-command-bar justify-between">
              <span class="truncate text-sm text-muted">{{ compressFile?.name || $t('tools.pdf.noPdfSelected') }}</span>
              <UButton color="primary" @click="doCompress" :disabled="!compressFile || compressLoading" class="rounded-full px-5 py-2.5 text-sm">
                <template #leading><UIcon name="i-lucide-minimize-2" class="size-4" /></template>
                {{ compressLoading ? $t('tools.pdf.compressing') : $t('tools.pdf.compressDownload') }}
              </UButton>
            </div>
          </div>
        </ToolSection>

        <ToolSection v-if="activeTab === 'merge'" :title="$t('tools.pdf.mergeTitle')" :description="$t('tools.pdf.mergeDesc')">
          <div class="space-y-5">
            <FileDropZone accept=".pdf" multiple :title="$t('tools.pdf.selectPdf')" :hint="$t('tools.pdf.dropHintMultiple')" @files="addMergeFiles" />
            <div v-if="mergeFiles.length" class="space-y-2">
              <div v-for="(item, i) in mergeFiles" :key="`${item.name}-${item.file.size}-${item.file.lastModified}-${i}`" class="tool-list-item flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium text-default">{{ item.name }}</div>
                  <div class="text-xs text-muted">{{ Math.round(item.file.size / 1024) }} KB</div>
                </div>
                <div class="flex shrink-0 gap-1">
                  <UButton color="neutral" variant="ghost" icon="i-lucide-chevron-up" size="xs" @click="moveMergeFile(i, -1)" :disabled="i === 0" class="rounded-full" :aria-label="$t('tools.pdf.moveUp', { name: item.name })" />
                  <UButton color="neutral" variant="ghost" icon="i-lucide-chevron-down" size="xs" @click="moveMergeFile(i, 1)" :disabled="i === mergeFiles.length - 1" class="rounded-full" :aria-label="$t('tools.pdf.moveDown', { name: item.name })" />
                  <UButton color="neutral" variant="ghost" icon="i-lucide-trash2" size="xs" @click="removeMergeFile(i)" class="rounded-full" :aria-label="$t('tools.pdf.removeFile', { name: item.name })" />
                </div>
              </div>
            </div>
            <UButton color="primary" @click="doMerge" :disabled="!mergeFiles.length || mergeLoading" class="rounded-full px-5 py-2.5 text-sm">
              <template #leading><UIcon name="i-lucide-merge" class="size-4" /></template>
              {{ mergeLoading ? $t('tools.pdf.merging') : $t('tools.pdf.mergeDownload') }}
            </UButton>
          </div>
        </ToolSection>

        <ToolSection v-if="activeTab === 'split'" :title="$t('tools.pdf.splitTitle')" :description="$t('tools.pdf.splitDesc')">
          <div class="space-y-5">
            <FileDropZone accept=".pdf" :title="$t('tools.pdf.selectPdf')" :hint="$t('tools.pdf.dropHint')" @files="onSplitFiles" />
            <UFormField :label="$t('tools.pdf.pageRangeWithExample')">
              <UInput v-model="splitRanges" :placeholder="$t('tools.pdf.pageRangePlaceholder')" class="w-full" />
            </UFormField>
            <div class="tool-command-bar justify-between">
              <span class="truncate text-sm text-muted">{{ splitFile?.name || $t('tools.pdf.noPdfSelected') }}</span>
              <UButton color="primary" @click="doSplit" :disabled="!splitFile || splitLoading" class="rounded-full px-5 py-2.5 text-sm">
                <template #leading><UIcon name="i-lucide-scissors" class="size-4" /></template>
                {{ splitLoading ? $t('tools.pdf.splitting') : $t('tools.pdf.splitDownload') }}
              </UButton>
            </div>
          </div>
        </ToolSection>

        <ToolSection v-if="activeTab === 'watermark'" :title="$t('tools.pdf.watermarkTitle')" :description="$t('tools.pdf.watermarkDesc')">
          <div class="space-y-5">
            <FileDropZone accept=".pdf" :title="$t('tools.pdf.selectPdf')" :hint="$t('tools.pdf.dropHint')" @files="onWmFiles" />
            <div class="tool-control-grid">
              <UFormField :label="$t('tools.pdf.wmText')"><UInput v-model="wmText" class="w-full" /></UFormField>
              <UFormField :label="$t('tools.pdf.wmColor')">
                <UColorPicker v-model="wmColor" format="hex" size="sm" />
              </UFormField>
              <UFormField :label="$t('tools.pdf.wmSizeValue', { size: wmSize })">
                <USlider v-model="wmSize" :min="12" :max="120" :step="1" />
              </UFormField>
            </div>
            <div class="tool-command-bar justify-between">
              <span class="truncate text-sm text-muted">{{ wmFile?.name || $t('tools.pdf.noPdfSelected') }}</span>
              <UButton color="primary" @click="doWatermark" :disabled="!wmFile || wmLoading" class="rounded-full px-5 py-2.5 text-sm">
                <template #leading><UIcon name="i-lucide-type" class="size-4" /></template>
                {{ wmLoading ? $t('tools.pdf.processing') : $t('tools.pdf.wmDownload') }}
              </UButton>
            </div>
          </div>
        </ToolSection>

        <ToolSection v-if="activeTab === 'toImage'" :title="$t('tools.pdf.toImageTitle')" :description="$t('tools.pdf.toImageDesc')">
          <div class="space-y-5">
            <FileDropZone accept=".pdf" :title="$t('tools.pdf.selectPdf')" :hint="$t('tools.pdf.dropHint')" @files="onTiFiles" />
            <UFormField :label="$t('tools.pdf.dpiValue', { dpi: tiDpi })">
              <USlider v-model="tiDpi" :min="72" :max="MAX_TO_IMAGE_DPI" :step="1" />
            </UFormField>
            <div class="tool-command-bar justify-between">
              <span class="truncate text-sm text-muted">{{ tiFile?.name || $t('tools.pdf.noPdfSelected') }}</span>
              <UButton color="primary" @click="doToImage" :disabled="!tiFile || tiLoading" class="rounded-full px-5 py-2.5 text-sm">
                {{ tiLoading ? $t('tools.pdf.converting') : $t('tools.pdf.convertToImage') }}
              </UButton>
            </div>
          </div>
        </ToolSection>
      </div>

      <div class="tool-preview-sticky space-y-4">
        <ToolSection :title="$t('tools.pdf.taskStatus')" compact>
          <div class="space-y-3">
            <div class="tool-metric-card">
              <div class="text-xs font-bold uppercase tracking-[0.18em] text-muted">{{ $t('tools.pdf.currentMode') }}</div>
              <div class="mt-2 text-2xl font-black text-highlighted">{{ activeTabLabel }}</div>
            </div>
            <div class="tool-metric-card">
              <div class="text-xs font-bold uppercase tracking-[0.18em] text-muted">{{ $t('tools.pdf.fileStatus') }}</div>
              <div class="mt-2 text-sm text-muted">{{ currentFileStatus }}</div>
            </div>
            <UAlert
              color="primary"
              variant="soft"
              icon="i-lucide-info"
              :description="$t('tools.pdf.workerNotice')"
            />
          </div>
        </ToolSection>

        <ToolSection v-if="activeTab === 'toImage'" :title="$t('tools.pdf.imagePreview')" compact>
          <div v-if="tiResults.length" class="grid grid-cols-2 gap-3">
            <div v-for="r in tiResults" :key="r.idx" class="tool-stage relative overflow-hidden shadow-sm">
              <img :src="r.url" class="w-full" :alt="$t('tools.pdf.pageAlt', { n: r.idx })" />
              <span class="absolute bottom-1 left-1 rounded bg-inverted/80 px-1.5 py-0.5 text-xs text-inverted">{{ $t('tools.pdf.convertedPage', { n: r.idx }) }}</span>
            </div>
          </div>
          <div v-else class="tool-stage p-6 text-center text-sm text-muted">
            {{ $t('tools.pdf.toImageEmpty') }}
          </div>
        </ToolSection>
      </div>
    </div>
  </ToolPage>
</template>
