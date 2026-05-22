<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { ArrowRightLeft, FileUp, X, Download } from '@lucide/vue'
import { useToolState, useFileHandler } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import CopyBtn from '@/components/CopyBtn.vue'

const MAX_TEXT_CONVERT_CHARS = 2_000_000
const MAX_FILE_ENCODE_BYTES = 500 * 1024 * 1024

const mode = ref<'encode' | 'decode'>('encode')
const result = ref('')
const addDataUri = ref(false)
const imgPreview = ref('')
const showPreview = ref(false)
const isLargeDecode = ref(false)
const encodeError = ref('')

const { input, history, saveHistory } = useToolState<string, { mode: 'encode' | 'decode'; input: string }>({
  storageKey: 'base64',
  defaultInput: '',
  historyOptions: {
    maxCount: 15,
    generateLabel: (d) => `[${d.mode === 'encode' ? '编码' : '解码'}] ${d.input.slice(0, 40)}${d.input.length > 40 ? '...' : ''}`,
  },
})

const fileHandler = useFileHandler({ maxSize: MAX_FILE_ENCODE_BYTES })
const fileBase64 = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function onHistorySelect(item: { data: { mode: 'encode' | 'decode'; input: string } }) {
  mode.value = item.data.mode
  input.value = item.data.input
}

function isImageFile(file: File): boolean { return file.type.startsWith('image/') }

function looksLikeImageBase64(s: string): boolean {
  const clean = s.trim().replace(/\s/g, '')
  if (clean.startsWith('data:image')) return true
  try {
    const head = atob(clean.slice(0, 32))
    return head.includes('PNG') || head.includes('JFIF') || head.includes('GIF') || head.startsWith('\x89') || head.startsWith('RIFF')
  } catch { return false }
}

function guessMimeFromBase64(s: string): string {
  if (s.startsWith('data:')) { const match = s.match(/data:([^;]+)/); return match?.[1] ?? 'application/octet-stream' }
  try {
    const head = atob(s.slice(0, 32))
    if (head.includes('PNG') || head.startsWith('\x89')) return 'image/png'
    if (head.includes('JFIF') || head.startsWith('\xFF\xD8')) return 'image/jpeg'
    if (head.includes('GIF')) return 'image/gif'
    if (head.startsWith('RIFF')) return 'image/webp'
  } catch { /* ignore */ }
  return 'application/octet-stream'
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' }
  return map[mime] || ''
}

function cleanupPreview() {
  if (imgPreview.value?.startsWith('blob:')) URL.revokeObjectURL(imgPreview.value)
  imgPreview.value = ''; showPreview.value = false
}

async function updatePreview() {
  if (mode.value !== 'decode' || !input.value) { cleanupPreview(); return }
  const clean = input.value.trim().replace(/\s/g, '')
  let base64 = clean
  if (base64.startsWith('data:')) base64 = base64.split(',')[1] || base64
  if (!looksLikeImageBase64(clean) && !clean.startsWith('data:image')) { cleanupPreview(); return }
  try {
    const mime = guessMimeFromBase64(clean)
    const res = await fetch(`data:${mime};base64,${base64}`)
    const blob = await res.blob()
    cleanupPreview()
    imgPreview.value = URL.createObjectURL(blob)
    showPreview.value = true
  } catch { cleanupPreview() }
}

function onImgError() { showPreview.value = false }

function computeResult() {
  encodeError.value = ''
  if (!input.value) { result.value = ''; isLargeDecode.value = false; return }
  try {
    if (mode.value === 'encode') {
      isLargeDecode.value = false
      if (input.value.length > MAX_TEXT_CONVERT_CHARS) { result.value = `输入过长...`; return }
      const bytes = new TextEncoder().encode(input.value)
      const bin = new Uint8Array(bytes)
      let str = ''
      for (let i = 0; i < bin.length; i++) str += String.fromCharCode(bin[i]!)
      result.value = btoa(str)
    } else {
      const clean = input.value.trim().replace(/\s/g, '')
      isLargeDecode.value = clean.length >= 2_000_000
      if (clean.startsWith('data:image')) { result.value = isLargeDecode.value ? '' : clean.split(',')[1] || clean; return }
      if (looksLikeImageBase64(clean)) { result.value = isLargeDecode.value ? '' : clean; return }
      if (isLargeDecode.value) { result.value = '输入过大（疑似二进制数据），已跳过文本解码，请查看图片预览或下载文件'; return }
      const bin = atob(clean)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      result.value = new TextDecoder().decode(bytes)
    }
  } catch { result.value = '转换失败，请检查输入内容' }
}

let computeTimer: ReturnType<typeof setTimeout> | null = null
function debouncedCompute() {
  if (computeTimer) clearTimeout(computeTimer)
  computeTimer = setTimeout(() => { computeResult(); updatePreview() }, 150)
}

watch([input, mode], debouncedCompute)

const finalResult = computed(() => {
  if (fileHandler.file.value) {
    if (addDataUri.value && !fileBase64.value.startsWith('data:')) {
      const mime = isImageFile(fileHandler.file.value) ? fileHandler.file.value.type : 'application/octet-stream'
      return `data:${mime};base64,` + fileBase64.value
    }
    return fileBase64.value
  }
  if (mode.value === 'encode' && addDataUri.value && result.value) return 'data:text/plain;base64,' + result.value
  return result.value
})

const resultDisplay = computed(() => {
  if (fileHandler.file.value && fileBase64.value.length > 100_000)
    return fileBase64.value.slice(0, 500) + '\n...（内容过长已折叠）'
  if (isLargeDecode.value && !result.value) return '输入为大型 Base64 数据，已跳过文本展示，请使用下方下载按钮'
  return finalResult.value
})

const uploadedImageSrc = computed(() => {
  if (!fileHandler.file.value || !isImageFile(fileHandler.file.value) || !fileBase64.value) return ''
  return `data:${fileHandler.file.value.type || 'image/png'};base64,${fileBase64.value}`
})

const isImageResult = computed(() => {
  const src = fileHandler.file.value ? fileBase64.value : input.value
  return mode.value === 'decode' && (fileHandler.file.value ? isImageFile(fileHandler.file.value) : looksLikeImageBase64(src))
})

async function downloadDecodedFile() {
  const clean = input.value.trim().replace(/\s/g, '')
  let base64 = clean
  if (base64.startsWith('data:')) base64 = base64.split(',')[1] || base64
  const mime = guessMimeFromBase64(clean)
  try {
    const res = await fetch(`data:${mime};base64,${base64}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'decoded' + extFromMime(mime); link.click()
    URL.revokeObjectURL(url)
  } catch { /* ignore */ }
}

function setMode(newMode: 'encode' | 'decode') {
  if (mode.value === newMode) return
  mode.value = newMode; fileHandler.removeFile(); fileBase64.value = ''; input.value = ''; result.value = ''; isLargeDecode.value = false; encodeError.value = ''; cleanupPreview()
}
function switchMode() { setMode(mode.value === 'encode' ? 'decode' : 'encode') }
function handleFileUpload(e: Event) { const file = (e.target as HTMLInputElement).files?.[0]; if (file) setFile(file) }
function handleFileDrop(e: DragEvent) { e.preventDefault(); if (mode.value !== 'encode') return; const file = e.dataTransfer?.files?.[0]; if (file) setFile(file) }
function setFile(f: File) {
  encodeError.value = ''
  if (!fileHandler.setFile(f)) { encodeError.value = fileHandler.error.value; return }
  input.value = ''
  const reader = new FileReader()
  reader.onload = () => { const res = reader.result; if (typeof res !== 'string') return; fileBase64.value = res.split(',')[1] || ''; if (mode.value === 'decode') result.value = fileBase64.value }
  reader.readAsDataURL(f)
}
function removeFile() { fileHandler.removeFile(); fileBase64.value = ''; input.value = ''; result.value = ''; encodeError.value = '' }
function triggerFile() { if (fileInput.value) fileInput.value.value = ''; fileInput.value?.click() }
function downloadImage() {
  const src = fileHandler.file.value ? uploadedImageSrc.value : imgPreview.value
  if (!src) return
  const link = document.createElement('a'); link.href = src; link.download = 'decoded-image' + extFromMime(guessMimeFromBase64(input.value || '')); link.click()
}
onUnmounted(() => cleanupPreview())
</script>

<template>
  <ToolLayout max-width="3xl">
    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="mb-4 flex items-center gap-3 flex-wrap justify-between">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="inline-flex rounded-full bg-surface-variant p-1">
            <UButton variant="ghost" color="neutral" @click="setMode('encode')" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="mode === 'encode' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'">编码</UButton>
            <UButton variant="ghost" color="neutral" @click="setMode('decode')" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="mode === 'decode' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'">解码</UButton>
          </div>
          <UButton variant="ghost" color="neutral" @click="switchMode" class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-variant transition-colors" title="交换">
            <ArrowRightLeft class="h-4 w-4 text-on-surface-variant" />
          </UButton>
          <UButton v-if="mode === 'encode'" variant="ghost" color="neutral" @click="triggerFile" class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-primary hover:bg-primary-container transition-colors">
            <FileUp class="h-4 w-4" /> 文件转 Base64
          </UButton>
          <input v-if="mode === 'encode'" ref="fileInput" type="file" class="hidden" @change="handleFileUpload" />
        </div>
        <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
      </div>

      <div v-if="encodeError" class="mb-3 text-sm text-error">{{ encodeError }}</div>

      <div v-if="!fileHandler.file.value" @dragover.prevent @drop="handleFileDrop">
        <UTextarea v-model="input" @blur="saveHistory" :placeholder="mode === 'encode' ? '输入要编码的文本，或拖拽文件到此处...' : '输入要解码的 Base64（支持大图片直接粘贴）'" :rows="10" class="resize-none rounded-xl border border-outline bg-surface p-4 text-sm w-full" :class="mode === 'encode' ? 'border-dashed hover:border-primary hover:bg-primary-container/20' : ''" />
      </div>

      <div v-else class="relative flex items-center gap-3 rounded-xl bg-primary-container/30 px-4 py-3">
        <FileUp class="h-6 w-6 text-primary" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-on-surface">{{ fileHandler.file.value.name }}</div>
          <div class="text-xs text-on-surface-variant">{{ fileHandler.formatSize(fileHandler.file.value.size) }}</div>
        </div>
        <UButton variant="ghost" color="neutral" @click="removeFile" class="flex h-7 w-7 items-center justify-center rounded-full bg-surface shadow-sm hover:bg-surface-variant transition-colors">
          <X class="h-3.5 w-3.5 text-on-surface-variant" />
        </UButton>
      </div>
    </div>

    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-sm font-medium text-on-surface-variant">结果</span>
        <div class="flex items-center gap-3">
          <UCheckbox v-if="fileHandler.file.value && isImageFile(fileHandler.file.value)" v-model="addDataUri" label="Data URI 前缀" />
          <UButton v-if="showPreview || (fileHandler.file.value && isImageResult)" variant="ghost" color="neutral" @click="downloadImage" class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors">
            <Download class="h-3.5 w-3.5" /> 下载图片
          </UButton>
          <UButton v-if="isLargeDecode" variant="ghost" color="neutral" @click="downloadDecodedFile" class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors">
            <Download class="h-3.5 w-3.5" /> 下载文件
          </UButton>
          <CopyBtn v-if="finalResult && !(mode === 'decode' && isImageResult && !fileHandler.file.value) && !isLargeDecode" :text="finalResult" variant="button" />
        </div>
      </div>
      <div v-if="!(mode === 'decode' && isImageResult && !fileHandler.file.value)" class="break-all rounded-xl bg-surface-variant/50 p-4 font-mono text-sm text-on-surface whitespace-pre-wrap">
        {{ resultDisplay || '等待输入...' }}
      </div>
      <div v-if="(showPreview && mode === 'decode') || (fileHandler.file.value && isImageResult)" class="mt-4">
        <div class="mb-2 text-xs font-medium text-on-surface-variant">图片预览</div>
        <img :src="fileHandler.file.value ? uploadedImageSrc : imgPreview" class="max-h-64 rounded-xl object-contain" @error="onImgError" />
      </div>
    </div>
  </ToolLayout>
</template>
