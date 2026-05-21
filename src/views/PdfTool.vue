<script setup lang="ts">
import { ref } from 'vue'
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { Upload, Download, Trash2, Merge, Scissors, Type, Image as ImageIcon } from '@lucide/vue'
import { usePersistedRef } from '@/utils/persist'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const activeTab = usePersistedRef<'compress' | 'merge' | 'split' | 'watermark' | 'toImage'>('web-tools:pdf:tab', 'compress')

// ===== PDF 压缩 =====
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
    const doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    })
    const objectStreams = compressLevel.value !== 'light'
    const out = await doc.save({
      useObjectStreams: objectStreams,
      addDefaultPage: false,
      objectsPerTick: compressLevel.value === 'strong' ? 200 : 50,
    })
    const baseName = compressFile.value.name.replace(/\.pdf$/i, '') || 'document'
    downloadBlob(pdfBytesToBlob(out), `${baseName}_compressed.pdf`)
  } catch (e: any) {
    alert('压缩失败: ' + (e.message || e))
  } finally {
    compressLoading.value = false
  }
}

// ===== PDF 合并 =====
const mergeFiles = ref<{ file: File; name: string }[]>([])
const mergeLoading = ref(false)

function triggerMergeUpload() {
  const el = document.getElementById('pdf-merge-upload') as HTMLInputElement | null
  if (el) el.value = ''
  el?.click()
}

function handleMergeFiles(e: Event) {
  addMergeFiles(Array.from((e.target as HTMLInputElement).files || []))
}

function addMergeFiles(files: File[]) {
  const valid = files.filter(isPdfFile)
  mergeFiles.value.push(...valid.map((f) => ({ file: f, name: f.name })))
}

function handleMergeDrop(e: DragEvent) {
  e.preventDefault()
  addMergeFiles(Array.from(e.dataTransfer?.files || []))
}

function removeMergeFile(idx: number) {
  mergeFiles.value.splice(idx, 1)
}

function moveMergeFile(idx: number, dir: -1 | 1) {
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= mergeFiles.value.length) return
  const temp = mergeFiles.value[idx]
  mergeFiles.value[idx] = mergeFiles.value[newIdx]!
  mergeFiles.value[newIdx] = temp!
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
    const bytes = await merged.save()
    downloadBlob(pdfBytesToBlob(bytes), 'merged.pdf')
  } catch (e: any) {
    alert('合并失败: ' + (e.message || e))
  } finally {
    mergeLoading.value = false
  }
}

// ===== PDF 拆分 =====
const splitFile = ref<File | null>(null)
const splitRanges = usePersistedRef('web-tools:pdf:split-ranges', '1-3,5')
const splitLoading = ref(false)

function handleSplitFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setSplitFile(file)
}

function setSplitFile(file: File) {
  if (isPdfFile(file)) splitFile.value = file
}

function handleSplitDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) setSplitFile(file)
}

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
    if (!groups.length) {
      alert('页码范围格式错误')
      return
    }
    for (let i = 0; i < groups.length; i++) {
      const newDoc = await PDFDocument.create()
      const pages = await newDoc.copyPages(doc, groups[i]!)
      pages.forEach((p) => newDoc.addPage(p))
      const out = await newDoc.save()
      downloadBlob(pdfBytesToBlob(out), `split_${i + 1}.pdf`)
    }
  } catch (e: any) {
    alert('拆分失败: ' + (e.message || e))
  } finally {
    splitLoading.value = false
  }
}

// ===== PDF 水印 =====
const wmFile = ref<File | null>(null)
const wmText = usePersistedRef('web-tools:pdf:wm-text', 'CONFIDENTIAL')
const wmColor = usePersistedRef('web-tools:pdf:wm-color', '#ff0000')
const wmSize = usePersistedRef('web-tools:pdf:wm-size', 48)
const wmLoading = ref(false)

function handleWmFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setWmFile(file)
}

function setWmFile(file: File) {
  if (isPdfFile(file)) wmFile.value = file
}

function handleWmDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) setWmFile(file)
}

function hexToRgbTuple(hex: string) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6)
  const num = parseInt(full, 16)
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  }
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
        y: height / 2,
        size: wmSize.value,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity: 0.3,
        rotate: degrees(-45),
      })
    }
    const out = await doc.save()
    downloadBlob(pdfBytesToBlob(out), 'watermarked.pdf')
  } catch (e: any) {
    alert('添加水印失败: ' + (e.message || e))
  } finally {
    wmLoading.value = false
  }
}

// ===== PDF 转图片 =====
const tiFile = ref<File | null>(null)
const tiDpi = usePersistedRef('web-tools:pdf:ti-dpi', 150)
const tiLoading = ref(false)
const tiResults = ref<{ url: string; idx: number }[]>([])

function handleTiFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setTiFile(file)
}

function setTiFile(file: File) {
  if (!isPdfFile(file)) return
  tiFile.value = file
  tiResults.value.forEach((r) => URL.revokeObjectURL(r.url))
  tiResults.value = []
}

function handleTiDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) setTiFile(file)
}

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
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('图片导出失败'))), 'image/png')
      })
      results.push({ url: URL.createObjectURL(blob), idx: i })
    }
    tiResults.value = results
  } catch (e: any) {
    alert('转换失败: ' + (e.message || e))
  } finally {
    tiLoading.value = false
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

function pdfBytesToBlob(bytes: Uint8Array<ArrayBufferLike>): Blob {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Blob([buffer], { type: 'application/pdf' })
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <!-- 标签页 -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="t in [
          { key: 'compress', label: '压缩' },
          { key: 'merge', label: '合并' },
          { key: 'split', label: '拆分' },
          { key: 'watermark', label: '水印' },
          { key: 'toImage', label: '转图片' },
        ] as const"
        :key="t.key"
        @click="activeTab = t.key"
        class="rounded-full px-4 py-2 text-sm font-medium transition-colors"
        :class="
          activeTab === t.key
            ? 'bg-primary text-on-primary'
            : 'bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80'
        "
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 压缩 -->
    <div v-if="activeTab === 'compress'" class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <div
        class="flex items-center gap-3 rounded-2xl border-2 border-dashed border-outline p-4 transition-colors hover:border-primary hover:bg-primary-container/20"
        @dragover.prevent
        @drop="handleCompressDrop"
      >
        <label class="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors">
          <Upload class="h-4 w-4" />
          选择 PDF
          <input type="file" accept=".pdf" class="hidden" @change="handleCompressFile" />
        </label>
        <span v-if="compressFile" class="text-sm text-on-surface">{{ compressFile.name }}</span>
        <span v-else class="text-xs text-on-surface-variant">或拖拽 PDF 到此处</span>
      </div>

      <div class="rounded-xl bg-surface-variant/30 p-4 text-xs text-on-surface-variant">
        浏览器端 PDF 压缩会重新保存并优化对象流，适合部分未优化 PDF。扫描件或图片型 PDF 的体积可能不会明显下降。
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="level in [
            { key: 'light', label: '轻度' },
            { key: 'medium', label: '标准' },
            { key: 'strong', label: '强力' },
          ] as const"
          :key="level.key"
          @click="compressLevel = level.key"
          class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          :class="
            compressLevel === level.key
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80'
          "
        >
          {{ level.label }}
        </button>
      </div>

      <button
        @click="doCompress"
        :disabled="!compressFile || compressLoading"
        class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Download class="h-4 w-4" />
        {{ compressLoading ? '压缩中...' : '压缩并下载' }}
      </button>
    </div>

    <!-- 合并 -->
    <div v-if="activeTab === 'merge'" class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <div class="flex items-center justify-center">
        <button
          @click="triggerMergeUpload"
          @dragover.prevent
          @drop="handleMergeDrop"
          class="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-outline p-8 transition-colors hover:border-primary hover:bg-primary-container/30"
        >
          <Upload class="h-8 w-8 text-primary" />
          <span class="text-sm font-medium text-on-surface">添加 PDF 文件</span>
          <span class="text-xs text-on-surface-variant">可点击或拖拽多个 PDF，按列表顺序合并</span>
        </button>
        <input id="pdf-merge-upload" type="file" accept=".pdf" multiple class="hidden" @change="handleMergeFiles" />
      </div>

      <div v-if="mergeFiles.length" class="space-y-2">
        <div
          v-for="(item, idx) in mergeFiles"
          :key="idx"
          class="flex items-center gap-2 rounded-xl bg-surface-variant/30 px-3 py-2"
        >
          <span class="text-xs text-on-surface-variant w-6">{{ idx + 1 }}</span>
          <Merge class="h-4 w-4 text-on-surface-variant" />
          <span class="flex-1 truncate text-sm text-on-surface">{{ item.name }}</span>
          <div class="flex items-center gap-1">
            <button @click="moveMergeFile(idx, -1)" class="rounded p-1 hover:bg-surface-variant text-xs text-on-surface-variant" :disabled="idx === 0">↑</button>
            <button @click="moveMergeFile(idx, 1)" class="rounded p-1 hover:bg-surface-variant text-xs text-on-surface-variant" :disabled="idx === mergeFiles.length - 1">↓</button>
            <button @click="removeMergeFile(idx)" class="rounded p-1 hover:bg-surface-variant text-error">
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <button
        @click="doMerge"
        :disabled="mergeFiles.length < 2 || mergeLoading"
        class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Merge class="h-4 w-4" />
        {{ mergeLoading ? '合并中...' : '合并并下载' }}
      </button>
    </div>

    <!-- 拆分 -->
    <div v-if="activeTab === 'split'" class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <div
        class="flex items-center gap-3 rounded-2xl border-2 border-dashed border-outline p-4 transition-colors hover:border-primary hover:bg-primary-container/20"
        @dragover.prevent
        @drop="handleSplitDrop"
      >
        <label class="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors">
          <Upload class="h-4 w-4" />
          选择 PDF
          <input type="file" accept=".pdf" class="hidden" @change="handleSplitFile" />
        </label>
        <span v-if="splitFile" class="text-sm text-on-surface">{{ splitFile.name }}</span>
        <span v-else class="text-xs text-on-surface-variant">或拖拽 PDF 到此处</span>
      </div>

      <div>
        <label class="mb-1 block text-sm text-on-surface-variant">页码范围</label>
        <input
          v-model="splitRanges"
          placeholder="如 1-3,5,7-10"
          class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div class="mt-1 text-xs text-on-surface-variant">用逗号分隔，用短横线表示范围</div>
      </div>

      <button
        @click="doSplit"
        :disabled="!splitFile || splitLoading"
        class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Scissors class="h-4 w-4" />
        {{ splitLoading ? '拆分中...' : '拆分并下载' }}
      </button>
    </div>

    <!-- 水印 -->
    <div v-if="activeTab === 'watermark'" class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <div
        class="flex items-center gap-3 rounded-2xl border-2 border-dashed border-outline p-4 transition-colors hover:border-primary hover:bg-primary-container/20"
        @dragover.prevent
        @drop="handleWmDrop"
      >
        <label class="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors">
          <Upload class="h-4 w-4" />
          选择 PDF
          <input type="file" accept=".pdf" class="hidden" @change="handleWmFile" />
        </label>
        <span v-if="wmFile" class="text-sm text-on-surface">{{ wmFile.name }}</span>
        <span v-else class="text-xs text-on-surface-variant">或拖拽 PDF 到此处</span>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label class="mb-1 block text-xs text-on-surface-variant">水印文字</label>
          <input v-model="wmText" class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none" />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs text-on-surface-variant">颜色</label>
          <input v-model="wmColor" type="color" class="h-8 w-8 rounded border border-outline bg-transparent p-0.5" />
          <span class="text-xs text-on-surface">{{ wmColor }}</span>
        </div>
        <div>
          <label class="mb-1 block text-xs text-on-surface-variant">字号: {{ wmSize }}</label>
          <input v-model.number="wmSize" type="range" min="12" max="120" class="h-6 w-full" />
        </div>
      </div>

      <button
        @click="doWatermark"
        :disabled="!wmFile || wmLoading"
        class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Type class="h-4 w-4" />
        {{ wmLoading ? '处理中...' : '添加水印并下载' }}
      </button>
    </div>

    <!-- 转图片 -->
    <div v-if="activeTab === 'toImage'" class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <div
        class="flex items-center gap-3 rounded-2xl border-2 border-dashed border-outline p-4 transition-colors hover:border-primary hover:bg-primary-container/20"
        @dragover.prevent
        @drop="handleTiDrop"
      >
        <label class="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors">
          <Upload class="h-4 w-4" />
          选择 PDF
          <input type="file" accept=".pdf" class="hidden" @change="handleTiFile" />
        </label>
        <span v-if="tiFile" class="text-sm text-on-surface">{{ tiFile.name }}</span>
        <span v-else class="text-xs text-on-surface-variant">或拖拽 PDF 到此处</span>
      </div>

      <div>
        <label class="mb-1 block text-xs text-on-surface-variant">DPI: {{ tiDpi }}</label>
        <input v-model.number="tiDpi" type="range" min="72" max="300" step="10" class="h-6 w-full" />
      </div>

      <button
        @click="doToImage"
        :disabled="!tiFile || tiLoading"
        class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <ImageIcon class="h-4 w-4" />
        {{ tiLoading ? '转换中...' : '转为图片' }}
      </button>

      <div v-if="tiResults.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div v-for="r in tiResults" :key="r.idx" class="rounded-xl bg-surface-variant/30 p-2">
          <img :src="r.url" class="mb-2 h-32 w-full rounded-lg object-contain" />
          <div class="flex items-center justify-between">
            <span class="text-xs text-on-surface-variant">第 {{ r.idx }} 页</span>
            <a :href="r.url" :download="`page_${r.idx}.png`" class="text-xs text-primary hover:underline">下载</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
