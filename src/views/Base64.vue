<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Copy, Check, ArrowRightLeft, FileUp, X, Download } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'
import { usePersistedRef } from '@/utils/persist'
import { useHistory } from '@/utils/history'
import HistoryPanel from '@/components/HistoryPanel.vue'

const mode = usePersistedRef<'encode' | 'decode'>('web-tools:base64:mode', 'encode')
const input = usePersistedRef('web-tools:base64:input', '')
const result = ref('')

const base64History = useHistory<{ mode: 'encode' | 'decode'; input: string }>('web-tools:base64:history', {
  maxCount: 15,
  generateLabel: (d) => `[${d.mode === 'encode' ? '编码' : '解码'}] ${d.input.slice(0, 40)}${d.input.length > 40 ? '...' : ''}`,
})

function saveHistory() {
  if (!input.value.trim()) return
  base64History.add({ mode: mode.value, input: input.value })
}

function onHistorySelect(item: { data: { mode: 'encode' | 'decode'; input: string } }) {
  mode.value = item.data.mode
  input.value = item.data.input
}
const copied = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const imgPreview = ref('')
const showPreview = ref(false)
const addDataUri = ref(false)
const uploadedFile = ref<File | null>(null)
const fileBase64 = ref('')
const computing = ref(false)
const isLargeDecode = ref(false)
const encodeError = ref('')

const MAX_TEXT_CONVERT_CHARS = 2_000_000
const MAX_FILE_ENCODE_BYTES = 500 * 1024 * 1024

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

function looksLikeImageBase64(s: string): boolean {
  const clean = s.trim().replace(/\s/g, '')
  if (clean.startsWith('data:image')) return true
  try {
    const head = atob(clean.slice(0, 32))
    return (
      head.includes('PNG') ||
      head.includes('JFIF') ||
      head.includes('GIF') ||
      head.startsWith('\x89') ||
      head.startsWith('RIFF')
    )
  } catch {
    return false
  }
}

function guessMimeFromBase64(s: string): string {
  if (s.startsWith('data:')) {
    const match = s.match(/data:([^;]+)/)
    return match?.[1] ?? 'application/octet-stream'
  }
  try {
    const head = atob(s.slice(0, 32))
    if (head.includes('PNG') || head.startsWith('\x89')) return 'image/png'
    if (head.includes('JFIF') || head.includes('Exif')) return 'image/jpeg'
    if (head.includes('GIF')) return 'image/gif'
    if (head.startsWith('RIFF')) return 'image/webp'
    if (head.startsWith('\xFF\xD8')) return 'image/jpeg'
  } catch {
    /* ignore */
  }
  return 'application/octet-stream'
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  }
  return map[mime] || ''
}

function cleanupPreview() {
  if (imgPreview.value && imgPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(imgPreview.value)
  }
  imgPreview.value = ''
  showPreview.value = false
}

async function updatePreview() {
  if (mode.value !== 'decode' || !input.value) {
    cleanupPreview()
    return
  }

  const clean = input.value.trim().replace(/\s/g, '')
  let base64 = clean
  if (base64.startsWith('data:')) {
    base64 = base64.split(',')[1] || base64
  }

  if (!looksLikeImageBase64(clean) && !clean.startsWith('data:image')) {
    cleanupPreview()
    return
  }

  try {
    const mime = guessMimeFromBase64(clean)
    const dataUrl = `data:${mime};base64,${base64}`
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    cleanupPreview()
    imgPreview.value = URL.createObjectURL(blob)
    showPreview.value = true
  } catch {
    cleanupPreview()
  }
}

function onImgError() {
  showPreview.value = false
}

watch([input, mode], () => {
  debouncedCompute()
})

let computeTimer: ReturnType<typeof setTimeout> | null = null
function debouncedCompute() {
  if (computeTimer) clearTimeout(computeTimer)
  computing.value = true
  computeTimer = setTimeout(() => {
    computeResult()
    updatePreview()
    computing.value = false
  }, 150)
}

function computeResult() {
  encodeError.value = ''
  if (!input.value) {
    result.value = ''
    isLargeDecode.value = false
    return
  }
  try {
    if (mode.value === 'encode') {
      isLargeDecode.value = false
      if (input.value.length > MAX_TEXT_CONVERT_CHARS) {
        result.value = `输入过长，已暂停实时转换。请控制在 ${MAX_TEXT_CONVERT_CHARS.toLocaleString()} 字符以内，或使用文件模式。`
        return
      }
      const bytes = new TextEncoder().encode(input.value)
      const bin = new Uint8Array(bytes)
      let str = ''
      for (let i = 0; i < bin.length; i++) {
        str += String.fromCharCode(bin[i]!)
      }
      result.value = btoa(str)
    } else {
      const clean = input.value.trim().replace(/\s/g, '')
      isLargeDecode.value = clean.length >= 2_000_000

      if (clean.startsWith('data:image')) {
        result.value = isLargeDecode.value ? '' : clean.split(',')[1] || clean
        return
      }
      if (looksLikeImageBase64(clean)) {
        result.value = isLargeDecode.value ? '' : clean
        return
      }
      if (isLargeDecode.value) {
        result.value = '输入过大（疑似二进制数据），已跳过文本解码，请查看图片预览或下载文件'
        return
      }
      const bin = atob(clean)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i)
      }
      result.value = new TextDecoder().decode(bytes)
    }
  } catch {
    result.value = '转换失败，请检查输入内容'
  }
}

const finalResult = computed(() => {
  if (uploadedFile.value) {
    if (addDataUri.value && !fileBase64.value.startsWith('data:')) {
      const mime = isImageFile(uploadedFile.value)
        ? uploadedFile.value.type
        : 'application/octet-stream'
      return `data:${mime};base64,` + fileBase64.value
    }
    return fileBase64.value
  }
  if (mode.value === 'encode' && addDataUri.value && result.value) {
    return 'data:text/plain;base64,' + result.value
  }
  return result.value
})

const resultDisplay = computed(() => {
  if (uploadedFile.value && fileBase64.value.length > 100_000) {
    const prefix = fileBase64.value.slice(0, 500)
    return (
      prefix +
      '\n...（内容过长已折叠，原始数据约 ' +
      formatSize(uploadedFile.value.size) +
      '）'
    )
  }
  if (isLargeDecode.value && !result.value) {
    return '输入为大型 Base64 数据，已跳过文本展示，请使用下方下载按钮'
  }
  return finalResult.value
})

const uploadedImageSrc = computed(() => {
  if (!uploadedFile.value || !isImageFile(uploadedFile.value) || !fileBase64.value) return ''
  return `data:${uploadedFile.value.type || 'image/png'};base64,${fileBase64.value}`
})

const isImageResult = computed(() => {
  const src = uploadedFile.value ? fileBase64.value : input.value
  return (
    mode.value === 'decode' &&
    (uploadedFile.value ? isImageFile(uploadedFile.value) : looksLikeImageBase64(src))
  )
})

async function copyResult() {
  const val = finalResult.value
  if (!val) return
  if (val.length > 10_000_000) {
    try {
      const blob = new Blob([val], { type: 'text/plain' })
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })])
      copied.value = true
      setTimeout(() => (copied.value = false), 1500)
      return
    } catch {
      /* fallback */
    }
  }
  const ok = await copyToClipboard(val)
  if (!ok) return
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

async function downloadDecodedFile() {
  const clean = input.value.trim().replace(/\s/g, '')
  let base64 = clean
  if (base64.startsWith('data:')) {
    base64 = base64.split(',')[1] || base64
  }

  const mime = guessMimeFromBase64(clean)
  const dataUrl = `data:${mime};base64,${base64}`
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'decoded' + extFromMime(mime)
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    /* ignore */
  }
}

function setMode(newMode: 'encode' | 'decode') {
  if (mode.value === newMode) return
  mode.value = newMode
  uploadedFile.value = null
  fileBase64.value = ''
  input.value = ''
  result.value = ''
  isLargeDecode.value = false
  encodeError.value = ''
  cleanupPreview()
}

function switchMode() {
  setMode(mode.value === 'encode' ? 'decode' : 'encode')
}

function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  setFile(file)
}

function handleFileDrop(e: DragEvent) {
  e.preventDefault()
  if (mode.value !== 'encode') return
  const file = e.dataTransfer?.files?.[0]
  if (file) setFile(file)
}

function setFile(f: File) {
  encodeError.value = ''
  if (f.size > MAX_FILE_ENCODE_BYTES) {
    encodeError.value = `文件超过 ${formatSize(MAX_FILE_ENCODE_BYTES)}，无法编码`
    return
  }
  uploadedFile.value = f
  input.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    const res = reader.result
    if (typeof res !== 'string') return
    fileBase64.value = res.split(',')[1] || ''
    if (mode.value === 'decode') result.value = fileBase64.value
  }
  reader.readAsDataURL(f)
}

function removeFile() {
  uploadedFile.value = null
  fileBase64.value = ''
  input.value = ''
  result.value = ''
  encodeError.value = ''
}

function triggerFile() {
  if (fileInput.value) fileInput.value.value = ''
  fileInput.value?.click()
}

function downloadImage() {
  const src = uploadedFile.value ? uploadedImageSrc.value : imgPreview.value
  if (!src) return
  const link = document.createElement('a')
  link.href = src
  link.download = 'decoded-image' + extFromMime(guessMimeFromBase64(input.value || ''))
  link.click()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

onUnmounted(() => {
  cleanupPreview()
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="mb-4 flex items-center gap-3 flex-wrap justify-between">
        <div class="flex items-center gap-3 flex-wrap">
        <div class="inline-flex rounded-full bg-surface-variant p-1">
          <button
            @click="setMode('encode')"
            class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            :class="
              mode === 'encode'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant'
            "
          >
            编码
          </button>
          <button
            @click="setMode('decode')"
            class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            :class="
              mode === 'decode'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant'
            "
          >
            解码
          </button>
        </div>
        <button
          @click="switchMode"
          class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
          title="交换"
        >
          <ArrowRightLeft class="h-4 w-4 text-on-surface-variant" />
        </button>
        <button
          v-if="mode === 'encode'"
          @click="triggerFile"
          class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-primary hover:bg-primary-container transition-colors"
        >
          <FileUp class="h-4 w-4" />
          文件转 Base64
        </button>
        <input
          v-if="mode === 'encode'"
          ref="fileInput"
          type="file"
          class="hidden"
          @change="handleFileUpload"
        />
        </div>
        <HistoryPanel
          :items="base64History.items.value"
          @select="onHistorySelect"
          @remove="base64History.remove"
          @clear="base64History.clear"
        />
      </div>

      <div v-if="encodeError" class="mb-3 text-sm text-error">{{ encodeError }}</div>

      <!-- 文本输入 -->
      <div
        v-if="!uploadedFile"
        @dragover.prevent
        @drop="handleFileDrop"
      >
        <textarea
          v-model="input"
          @blur="saveHistory"
          :placeholder="
            mode === 'encode'
              ? '输入要编码的文本，或拖拽文件到此处...'
              : '输入要解码的 Base64（支持大图片直接粘贴）'
          "
          class="h-40 w-full resize-none rounded-xl border border-outline bg-surface p-4 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          :class="mode === 'encode' ? 'border-dashed hover:border-primary hover:bg-primary-container/20' : ''"
        />
      </div>

      <!-- 文件卡片 -->
      <div
        v-else
        class="relative flex items-center gap-3 rounded-xl bg-primary-container/30 px-4 py-3"
      >
        <FileUp class="h-6 w-6 text-primary" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-on-surface">{{ uploadedFile.name }}</div>
          <div class="text-xs text-on-surface-variant">{{ formatSize(uploadedFile.size) }}</div>
        </div>
        <button
          @click="removeFile"
          class="flex h-7 w-7 items-center justify-center rounded-full bg-surface shadow-sm hover:bg-surface-variant transition-colors"
        >
          <X class="h-3.5 w-3.5 text-on-surface-variant" />
        </button>
      </div>
    </div>

    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-sm font-medium text-on-surface-variant">结果</span>
        <div class="flex items-center gap-3">
          <label
            v-if="uploadedFile && isImageFile(uploadedFile)"
            class="flex cursor-pointer items-center gap-1.5 text-xs text-on-surface-variant"
          >
            <input v-model="addDataUri" type="checkbox" class="h-3.5 w-3.5 accent-primary" />
            Data URI 前缀
          </label>
          <button
            v-if="showPreview || (uploadedFile && isImageResult)"
            @click="downloadImage"
            class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
          >
            <Download class="h-3.5 w-3.5" />
            下载图片
          </button>
          <button
            v-if="isLargeDecode"
            @click="downloadDecodedFile"
            class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
          >
            <Download class="h-3.5 w-3.5" />
            下载文件
          </button>
          <button
            v-if="finalResult && !(mode === 'decode' && isImageResult && !uploadedFile) && !isLargeDecode"
            @click="copyResult"
            class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
          >
            <Check v-if="copied" class="h-3.5 w-3.5" />
            <Copy v-else class="h-3.5 w-3.5" />
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>
      </div>
      <div
        v-if="!(mode === 'decode' && isImageResult && !uploadedFile)"
        class="break-all rounded-xl bg-surface-variant/50 p-4 font-mono text-sm text-on-surface whitespace-pre-wrap"
      >
        <span v-if="computing" class="text-on-surface-variant">计算中...</span>
        <span v-else>{{ resultDisplay || '等待输入...' }}</span>
      </div>
      <div
        v-if="(showPreview && mode === 'decode') || (uploadedFile && isImageResult)"
        class="mt-4"
      >
        <div class="mb-2 text-xs font-medium text-on-surface-variant">图片预览</div>
        <img
          :src="uploadedFile ? uploadedImageSrc : imgPreview"
          class="max-h-64 rounded-xl object-contain"
          @error="onImgError"
        />
      </div>
    </div>
  </div>
</template>
