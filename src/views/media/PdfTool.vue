<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { usePersistedRef } from '@/utils/persist'
import PdfWorker from '@/workers/pdf.worker?worker'
import { createWorkerPool } from '@/workers/pool'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'

const toast = useToast()
const pdfWorkerPool = createWorkerPool(() => new PdfWorker(), { size: 1 })
const MAX_PDF_BYTES = 100 * 1024 * 1024
const MAX_TO_IMAGE_PAGES = 30
const MAX_TO_IMAGE_DPI = 300

const activeTab = usePersistedRef<'compress' | 'merge' | 'split' | 'watermark' | 'toImage'>('web-tools:pdf:tab', 'compress')

// PDF 压缩
const compressFile = ref<File | null>(null)
const compressLevel = usePersistedRef<'light' | 'medium' | 'strong'>('web-tools:pdf:compress-level', 'medium')
const compressLoading = ref(false)

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
function canUsePdf(file: File): boolean {
  if (!isPdfFile(file)) return false
  if (file.size <= MAX_PDF_BYTES) return true
  toast.add({ title: 'PDF 文件过大', description: '请使用 100MB 以内的 PDF 文件。', color: 'warning' })
  return false
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
  } catch (e: any) { toast.add({ title: '压缩失败', description: e.message || String(e), color: 'error' }) }
  finally { lease.release(); compressLoading.value = false }
}

// PDF 合并
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
  } catch (e: any) { toast.add({ title: '合并失败', description: e.message || String(e), color: 'error' }) }
  finally { lease.release(); mergeLoading.value = false }
}

// PDF 拆分
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
  } catch (e: any) { toast.add({ title: '拆分失败', description: e.message || String(e), color: 'error' }) }
  finally { lease.release(); splitLoading.value = false }
}

// PDF 水印
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
  } catch (e: any) { toast.add({ title: '添加水印失败', description: e.message || String(e), color: 'error' }) }
  finally { lease.release(); wmLoading.value = false }
}

// PDF 转图片
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
      toast.add({ title: '页数过多', description: `单次最多转换 ${MAX_TO_IMAGE_PAGES} 页。`, color: 'warning' })
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
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('图片导出失败'))), 'image/png')
      })
      results.push({ url: URL.createObjectURL(blob), idx: i })
    }
    clearTiResults()
    tiResults.value = results
  } catch (e: any) { toast.add({ title: '转换失败', description: e.message || String(e), color: 'error' }) }
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

const tabItems = [
  { value: 'compress' as const, label: '压缩', icon: 'i-lucide-minimize-2' },
  { value: 'merge' as const, label: '合并', icon: 'i-lucide-merge' },
  { value: 'split' as const, label: '拆分', icon: 'i-lucide-scissors' },
  { value: 'watermark' as const, label: '水印', icon: 'i-lucide-type' },
  { value: 'toImage' as const, label: '转图片', icon: 'i-lucide-image' },
]
</script>

<template>
  <ToolPage name="pdf" max-width="6xl">
    <ToolSection compact>
      <UTabs v-model="activeTab" :items="tabItems" />
    </ToolSection>

    <div class="tool-workspace">
      <div class="space-y-4">
        <ToolSection v-if="activeTab === 'compress'" title="压缩 PDF" description="选择压缩级别后导出更小体积的 PDF 文件。">
          <div class="space-y-5">
            <FileDropZone accept=".pdf" title="选择 PDF" hint="或拖拽 PDF 到此处" @files="onCompressFiles" />
            <div class="tool-control-grid">
              <UFormField label="压缩级别">
                <USelect v-model="compressLevel" :items="[{ label: '轻度', value: 'light' }, { label: '中等', value: 'medium' }, { label: '强力', value: 'strong' }]" class="w-full" />
              </UFormField>
            </div>
            <div class="tool-command-bar justify-between">
              <span class="truncate text-sm text-muted">{{ compressFile?.name || '尚未选择 PDF' }}</span>
              <UButton color="primary" @click="doCompress" :disabled="!compressFile || compressLoading" class="rounded-full px-5 py-2.5 text-sm">
                <template #leading><UIcon name="i-lucide-minimize-2" class="size-4" /></template>
                {{ compressLoading ? '压缩中...' : '压缩并下载' }}
              </UButton>
            </div>
          </div>
        </ToolSection>

        <ToolSection v-if="activeTab === 'merge'" title="合并 PDF" description="按队列顺序合并多个 PDF，可上下调整文件顺序。">
          <div class="space-y-5">
            <FileDropZone accept=".pdf" multiple title="选择 PDF" hint="或拖拽 PDF 到此处（可多选）" @files="addMergeFiles" />
            <div v-if="mergeFiles.length" class="space-y-2">
              <div v-for="(item, i) in mergeFiles" :key="`${item.name}-${item.file.size}-${item.file.lastModified}-${i}`" class="tool-list-item flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium text-default">{{ item.name }}</div>
                  <div class="text-xs text-muted">{{ Math.round(item.file.size / 1024) }} KB</div>
                </div>
                <div class="flex shrink-0 gap-1">
                  <UButton color="neutral" variant="ghost" icon="i-lucide-chevron-up" size="xs" @click="moveMergeFile(i, -1)" :disabled="i === 0" class="rounded-full" :aria-label="`上移 ${item.name}`" />
                  <UButton color="neutral" variant="ghost" icon="i-lucide-chevron-down" size="xs" @click="moveMergeFile(i, 1)" :disabled="i === mergeFiles.length - 1" class="rounded-full" :aria-label="`下移 ${item.name}`" />
                  <UButton color="neutral" variant="ghost" icon="i-lucide-trash2" size="xs" @click="removeMergeFile(i)" class="rounded-full" :aria-label="`移除 ${item.name}`" />
                </div>
              </div>
            </div>
            <UButton color="primary" @click="doMerge" :disabled="!mergeFiles.length || mergeLoading" class="rounded-full px-5 py-2.5 text-sm">
              <template #leading><UIcon name="i-lucide-merge" class="size-4" /></template>
              {{ mergeLoading ? '合并中...' : '合并并下载' }}
            </UButton>
          </div>
        </ToolSection>

        <ToolSection v-if="activeTab === 'split'" title="拆分 PDF" description="按页码范围导出一个或多个 PDF 文件，例如 1-3,5。">
          <div class="space-y-5">
            <FileDropZone accept=".pdf" title="选择 PDF" hint="或拖拽 PDF 到此处" @files="onSplitFiles" />
            <UFormField label="页码范围（如: 1-3,5）">
              <UInput v-model="splitRanges" placeholder="1-3,5" class="w-full" />
            </UFormField>
            <div class="tool-command-bar justify-between">
              <span class="truncate text-sm text-muted">{{ splitFile?.name || '尚未选择 PDF' }}</span>
              <UButton color="primary" @click="doSplit" :disabled="!splitFile || splitLoading" class="rounded-full px-5 py-2.5 text-sm">
                <template #leading><UIcon name="i-lucide-scissors" class="size-4" /></template>
                {{ splitLoading ? '拆分中...' : '拆分并下载' }}
              </UButton>
            </div>
          </div>
        </ToolSection>

        <ToolSection v-if="activeTab === 'watermark'" title="添加水印" description="给每页叠加文字水印，可设置颜色与字号。">
          <div class="space-y-5">
            <FileDropZone accept=".pdf" title="选择 PDF" hint="或拖拽 PDF 到此处" @files="onWmFiles" />
            <div class="tool-control-grid">
              <UFormField label="水印文字"><UInput v-model="wmText" class="w-full" /></UFormField>
              <UFormField label="颜色">
                <UColorPicker v-model="wmColor" format="hex" size="sm" />
              </UFormField>
              <UFormField :label="`字号: ${wmSize}`">
                <USlider v-model="wmSize" :min="12" :max="120" :step="1" />
              </UFormField>
            </div>
            <div class="tool-command-bar justify-between">
              <span class="truncate text-sm text-muted">{{ wmFile?.name || '尚未选择 PDF' }}</span>
              <UButton color="primary" @click="doWatermark" :disabled="!wmFile || wmLoading" class="rounded-full px-5 py-2.5 text-sm">
                <template #leading><UIcon name="i-lucide-type" class="size-4" /></template>
                {{ wmLoading ? '处理中...' : '添加水印并下载' }}
              </UButton>
            </div>
          </div>
        </ToolSection>

        <ToolSection v-if="activeTab === 'toImage'" title="PDF 转图片" description="按指定 DPI 将 PDF 页面渲染为 PNG 预览图。">
          <div class="space-y-5">
            <FileDropZone accept=".pdf" title="选择 PDF" hint="或拖拽 PDF 到此处" @files="onTiFiles" />
            <UFormField :label="`DPI: ${tiDpi}`">
              <USlider v-model="tiDpi" :min="72" :max="MAX_TO_IMAGE_DPI" :step="1" />
            </UFormField>
            <div class="tool-command-bar justify-between">
              <span class="truncate text-sm text-muted">{{ tiFile?.name || '尚未选择 PDF' }}</span>
              <UButton color="primary" @click="doToImage" :disabled="!tiFile || tiLoading" class="rounded-full px-5 py-2.5 text-sm">
                {{ tiLoading ? '转换中...' : '转换为图片' }}
              </UButton>
            </div>
          </div>
        </ToolSection>
      </div>

      <div class="tool-preview-sticky space-y-4">
        <ToolSection title="任务状态" compact>
          <div class="space-y-3">
            <div class="tool-metric-card">
              <div class="text-xs font-bold uppercase tracking-[0.18em] text-muted">当前模式</div>
              <div class="mt-2 text-2xl font-black text-highlighted">{{ tabItems.find((item) => item.value === activeTab)?.label }}</div>
            </div>
            <div class="tool-metric-card">
              <div class="text-xs font-bold uppercase tracking-[0.18em] text-muted">文件状态</div>
              <div class="mt-2 text-sm text-muted">
                <template v-if="activeTab === 'merge'">队列中 {{ mergeFiles.length }} 个 PDF</template>
                <template v-else-if="activeTab === 'compress'">{{ compressFile?.name || '等待选择文件' }}</template>
                <template v-else-if="activeTab === 'split'">{{ splitFile?.name || '等待选择文件' }}</template>
                <template v-else-if="activeTab === 'watermark'">{{ wmFile?.name || '等待选择文件' }}</template>
                <template v-else>{{ tiFile?.name || '等待选择文件' }}</template>
              </div>
            </div>
            <UAlert
              color="primary"
              variant="soft"
              icon="i-lucide-info"
              description="重型 PDF 操作会在 Worker 或动态模块中执行，处理完成后自动下载或在右侧显示预览。"
            />
          </div>
        </ToolSection>

        <ToolSection v-if="activeTab === 'toImage'" title="图片预览" compact>
          <div v-if="tiResults.length" class="grid grid-cols-2 gap-3">
            <div v-for="r in tiResults" :key="r.idx" class="tool-stage relative overflow-hidden shadow-sm">
              <img :src="r.url" class="w-full" :alt="`PDF 第 ${r.idx} 页`" />
              <span class="absolute bottom-1 left-1 rounded bg-inverted/80 px-1.5 py-0.5 text-xs text-inverted">第 {{ r.idx }} 页</span>
            </div>
          </div>
          <div v-else class="tool-stage p-6 text-center text-sm text-muted">
            转换后将在这里显示 PNG 页面预览。
          </div>
        </ToolSection>
      </div>
    </div>
  </ToolPage>
</template>
