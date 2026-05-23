<script setup lang="ts">
import { ref } from 'vue'
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { usePersistedRef } from '@/utils/persist'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolHeader from '@/components/ToolHeader.vue'
import ToolCard from '@/components/ToolCard.vue'
import FileDropZone from '@/components/FileDropZone.vue'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
const toast = useToast()

const activeTab = usePersistedRef<'compress' | 'merge' | 'split' | 'watermark' | 'toImage'>('web-tools:pdf:tab', 'compress')

// PDF 压缩
const compressFile = ref<File | null>(null)
const compressLevel = usePersistedRef<'light' | 'medium' | 'strong'>('web-tools:pdf:compress-level', 'medium')
const compressLoading = ref(false)

function handleCompressFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setCompressFile(file)
}
function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
function setCompressFile(file: File) {
  if (isPdfFile(file)) compressFile.value = file
}
function onCompressFiles(files: File[]) {
  const [file] = files
  if (file) setCompressFile(file)
}
function handleCompressDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) setCompressFile(file)
}

async function doCompress() {
  if (!compressFile.value) return
  compressLoading.value = true
  try {
    const bytes = await compressFile.value.arrayBuffer()
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
    const objectStreams = compressLevel.value !== 'light'
    const out = await doc.save({ useObjectStreams: objectStreams, addDefaultPage: false, objectsPerTick: compressLevel.value === 'strong' ? 200 : 50 })
    const baseName = compressFile.value.name.replace(/\.pdf$/i, '') || 'document'
    downloadBlob(pdfBytesToBlob(out), `${baseName}_compressed.pdf`)
  } catch (e: any) { toast.add({ title: '压缩失败', description: e.message || String(e), color: 'error' }) }
  finally { compressLoading.value = false }
}

// PDF 合并
const mergeFiles = ref<{ file: File; name: string }[]>([])
const mergeLoading = ref(false)

function triggerMergeUpload() {
  const el = document.getElementById('pdf-merge-upload') as HTMLInputElement | null
  if (el) el.value = ''; el?.click()
}
function handleMergeFiles(e: Event) { addMergeFiles(Array.from((e.target as HTMLInputElement).files || [])) }
function addMergeFiles(files: File[]) {
  const valid = files.filter(isPdfFile)
  mergeFiles.value.push(...valid.map((f) => ({ file: f, name: f.name })))
}
function handleMergeDrop(e: DragEvent) { e.preventDefault(); addMergeFiles(Array.from(e.dataTransfer?.files || [])) }
function removeMergeFile(idx: number) { mergeFiles.value.splice(idx, 1) }
function moveMergeFile(idx: number, dir: -1 | 1) {
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= mergeFiles.value.length) return
  const temp = mergeFiles.value[idx]; mergeFiles.value[idx] = mergeFiles.value[newIdx]!; mergeFiles.value[newIdx] = temp!
}

async function doMerge() {
  if (!mergeFiles.value.length) return
  mergeLoading.value = true
  try {
    const merged = await PDFDocument.create()
    for (const item of mergeFiles.value) {
      const bytes = await item.file.arrayBuffer()
      const doc = await PDFDocument.load(bytes)
      const pages = await merged.copyPages(doc, doc.getPageIndices())
      pages.forEach((p) => merged.addPage(p))
    }
    const bytes = await merged.save(); downloadBlob(pdfBytesToBlob(bytes), 'merged.pdf')
  } catch (e: any) { toast.add({ title: '合并失败', description: e.message || String(e), color: 'error' }) }
  finally { mergeLoading.value = false }
}

// PDF 拆分
const splitFile = ref<File | null>(null)
const splitRanges = usePersistedRef('web-tools:pdf:split-ranges', '1-3,5')
const splitLoading = ref(false)

function handleSplitFile(e: Event) { const file = (e.target as HTMLInputElement).files?.[0]; if (file) setSplitFile(file) }
function setSplitFile(file: File) { if (isPdfFile(file)) splitFile.value = file }
function onSplitFiles(files: File[]) {
  const [file] = files
  if (file) setSplitFile(file)
}
function handleSplitDrop(e: DragEvent) { e.preventDefault(); const file = e.dataTransfer?.files?.[0]; if (file) setSplitFile(file) }

function parseRanges(input: string, total: number): number[][] {
  const groups: number[][] = []
  const parts = input.split(',').map((s) => s.trim())
  for (const part of parts) {
    if (!part) continue
    const [startStr, endStr] = part.split('-')
    const start = Math.max(1, parseInt(startStr || ''))
    const end = endStr ? Math.min(total, parseInt(endStr)) : start
    if (isNaN(start) || start > total) continue
    const pages: number[] = []
    for (let i = start; i <= end; i++) pages.push(i - 1)
    if (pages.length) groups.push(pages)
  }
  return groups
}

async function doSplit() {
  if (!splitFile.value) return
  splitLoading.value = true
  try {
    const bytes = await splitFile.value.arrayBuffer()
    const doc = await PDFDocument.load(bytes)
    const total = doc.getPageCount()
    const groups = parseRanges(splitRanges.value, total)
    if (!groups.length) { toast.add({ title: '页码范围格式错误', color: 'warning' }); return }
    for (let i = 0; i < groups.length; i++) {
      const newDoc = await PDFDocument.create()
      const pages = await newDoc.copyPages(doc, groups[i]!)
      pages.forEach((p) => newDoc.addPage(p))
      const out = await newDoc.save(); downloadBlob(pdfBytesToBlob(out), `split_${i + 1}.pdf`)
    }
  } catch (e: any) { toast.add({ title: '拆分失败', description: e.message || String(e), color: 'error' }) }
  finally { splitLoading.value = false }
}

// PDF 水印
const wmFile = ref<File | null>(null)
const wmText = usePersistedRef('web-tools:pdf:wm-text', 'CONFIDENTIAL')
const wmColor = usePersistedRef('web-tools:pdf:wm-color', '#ff0000')
const wmSize = usePersistedRef('web-tools:pdf:wm-size', 48)
const wmLoading = ref(false)

function handleWmFile(e: Event) { const file = (e.target as HTMLInputElement).files?.[0]; if (file) setWmFile(file) }
function setWmFile(file: File) { if (isPdfFile(file)) wmFile.value = file }
function onWmFiles(files: File[]) {
  const [file] = files
  if (file) setWmFile(file)
}
function handleWmDrop(e: DragEvent) { e.preventDefault(); const file = e.dataTransfer?.files?.[0]; if (file) setWmFile(file) }

function hexToRgbTuple(hex: string) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6)
  const num = parseInt(full, 16)
  return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 }
}

async function doWatermark() {
  if (!wmFile.value) return
  wmLoading.value = true
  try {
    const bytes = await wmFile.value.arrayBuffer()
    const doc = await PDFDocument.load(bytes)
    const pages = doc.getPages()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const color = hexToRgbTuple(wmColor.value)
    for (const page of pages) {
      const { width, height } = page.getSize()
      page.drawText(wmText.value, {
        x: width / 2 - (wmText.value.length * wmSize.value * 0.3),
        y: height / 2, size: wmSize.value, font,
        color: rgb(color.r, color.g, color.b), opacity: 0.3, rotate: degrees(-45),
      })
    }
    const out = await doc.save(); downloadBlob(pdfBytesToBlob(out), 'watermarked.pdf')
  } catch (e: any) { toast.add({ title: '添加水印失败', description: e.message || String(e), color: 'error' }) }
  finally { wmLoading.value = false }
}

// PDF 转图片
const tiFile = ref<File | null>(null)
const tiDpi = usePersistedRef('web-tools:pdf:ti-dpi', 150)
const tiLoading = ref(false)
const tiResults = ref<{ url: string; idx: number }[]>([])

function handleTiFile(e: Event) { const file = (e.target as HTMLInputElement).files?.[0]; if (file) setTiFile(file) }
function setTiFile(file: File) {
  if (!isPdfFile(file)) return
  tiFile.value = file; tiResults.value.forEach((r) => URL.revokeObjectURL(r.url)); tiResults.value = []
}
function onTiFiles(files: File[]) {
  const [file] = files
  if (file) setTiFile(file)
}
function handleTiDrop(e: DragEvent) { e.preventDefault(); const file = e.dataTransfer?.files?.[0]; if (file) setTiFile(file) }

async function doToImage() {
  if (!tiFile.value) return
  tiLoading.value = true
  try {
    const bytes = await tiFile.value.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
    const scale = tiDpi.value / 72
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
    tiResults.value = results
  } catch (e: any) { toast.add({ title: '转换失败', description: e.message || String(e), color: 'error' }) }
  finally { tiLoading.value = false }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.download = filename; link.href = url; link.click()
  URL.revokeObjectURL(url)
}
function pdfBytesToBlob(bytes: Uint8Array) {
  return new Blob([bytes.slice().buffer], { type: 'application/pdf' })
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
  <ToolLayout max-width="4xl">
    <ToolHeader title="PDF 工具" description="压缩、合并、拆分、添加水印、转为图片" icon="i-lucide-file-text" />

    <UTabs v-model="activeTab" :items="tabItems" />

    <!-- 压缩 -->
    <ToolCard v-if="activeTab === 'compress'">
      <div class="space-y-4">
        <FileDropZone accept=".pdf" title="选择 PDF" hint="或拖拽 PDF 到此处" @files="onCompressFiles" />
        <USelect v-model="compressLevel" :items="[{ label: '轻度', value: 'light' }, { label: '中等', value: 'medium' }, { label: '强力', value: 'strong' }]" label="压缩级别" />
        <UButton color="primary" @click="doCompress" :disabled="!compressFile || compressLoading" class="rounded-full px-5 py-2.5 text-sm">
          <template #leading><UIcon name="i-lucide-minimize-2" class="size-4" /></template>
          {{ compressLoading ? '压缩中...' : '压缩并下载' }}
        </UButton>
      </div>
    </ToolCard>

    <!-- 合并 -->
    <ToolCard v-if="activeTab === 'merge'">
      <div class="space-y-4">
        <FileDropZone accept=".pdf" multiple title="选择 PDF" hint="或拖拽 PDF 到此处（可多选）" @files="addMergeFiles" />
        <div v-if="mergeFiles.length" class="space-y-2">
          <div v-for="(item, i) in mergeFiles" :key="i" class="flex items-center justify-between rounded-xl bg-elevated px-4 py-2">
            <span class="text-sm text-default">{{ item.name }}</span>
            <div class="flex gap-1">
              <UButton color="neutral" variant="ghost" icon="i-lucide-chevron-up" size="xs" @click="moveMergeFile(i, -1)" :disabled="i === 0" class="rounded-full" />
              <UButton color="neutral" variant="ghost" icon="i-lucide-chevron-down" size="xs" @click="moveMergeFile(i, 1)" :disabled="i === mergeFiles.length - 1" class="rounded-full" />
              <UButton color="neutral" variant="ghost" icon="i-lucide-trash2" size="xs" @click="removeMergeFile(i)" class="rounded-full" />
            </div>
          </div>
        </div>
        <UButton color="primary" @click="doMerge" :disabled="!mergeFiles.length || mergeLoading" class="rounded-full px-5 py-2.5 text-sm">
          <template #leading><UIcon name="i-lucide-merge" class="size-4" /></template>
          {{ mergeLoading ? '合并中...' : '合并并下载' }}
        </UButton>
      </div>
    </ToolCard>

    <!-- 拆分 -->
    <ToolCard v-if="activeTab === 'split'">
      <div class="space-y-4">
        <FileDropZone accept=".pdf" title="选择 PDF" hint="或拖拽 PDF 到此处" @files="onSplitFiles" />
        <UFormField label="页码范围（如: 1-3,5）">
          <UInput v-model="splitRanges" placeholder="1-3,5" class="w-full" />
        </UFormField>
        <UButton color="primary" @click="doSplit" :disabled="!splitFile || splitLoading" class="rounded-full px-5 py-2.5 text-sm">
          <template #leading><UIcon name="i-lucide-scissors" class="size-4" /></template>
          {{ splitLoading ? '拆分中...' : '拆分并下载' }}
        </UButton>
      </div>
    </ToolCard>

    <!-- 水印 -->
    <ToolCard v-if="activeTab === 'watermark'">
      <div class="space-y-4">
        <FileDropZone accept=".pdf" title="选择 PDF" hint="或拖拽 PDF 到此处" @files="onWmFiles" />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <UFormField label="水印文字"><UInput v-model="wmText" class="w-full" /></UFormField>
          <UFormField label="颜色">
            <UColorPicker v-model="wmColor" format="hex" size="sm" />
          </UFormField>
          <UFormField :label="`字号: ${wmSize}`">
            <USlider v-model="wmSize" :min="12" :max="120" :step="1" />
          </UFormField>
        </div>
        <UButton color="primary" @click="doWatermark" :disabled="!wmFile || wmLoading" class="rounded-full px-5 py-2.5 text-sm">
          <template #leading><UIcon name="i-lucide-type" class="size-4" /></template>
          {{ wmLoading ? '处理中...' : '添加水印并下载' }}
        </UButton>
      </div>
    </ToolCard>

    <!-- 转图片 -->
    <ToolCard v-if="activeTab === 'toImage'">
      <div class="space-y-4">
        <FileDropZone accept=".pdf" title="选择 PDF" hint="或拖拽 PDF 到此处" @files="onTiFiles" />
        <UFormField :label="`DPI: ${tiDpi}`">
          <USlider v-model="tiDpi" :min="72" :max="600" :step="1" />
        </UFormField>
        <UButton color="primary" @click="doToImage" :disabled="!tiFile || tiLoading" class="rounded-full px-5 py-2.5 text-sm">
          {{ tiLoading ? '转换中...' : '转换为图片' }}
        </UButton>
        <div v-if="tiResults.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div v-for="r in tiResults" :key="r.idx" class="relative rounded-xl overflow-hidden border border-default">
            <img :src="r.url" class="w-full" />
            <span class="absolute bottom-1 left-1 rounded bg-inverted/80 px-1.5 py-0.5 text-xs text-inverted">第 {{ r.idx }} 页</span>
          </div>
        </div>
      </div>
    </ToolCard>
  </ToolLayout>
</template>
