<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useToolState, useFileHandler } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'

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
  getHistoryData: (value) => ({ mode: mode.value, input: value }),
  historyOptions: {
    maxCount: 15,
    generateLabel: (d) => `[${d.mode === 'encode' ? '编码' : '解码'}] ${d.input.slice(0, 40)}${d.input.length > 40 ? '...' : ''}`,
  },
})

const fileHandler = useFileHandler({ maxSize: MAX_FILE_ENCODE_BYTES })
const fileBase64 = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const hasUploadedImageFile = computed(() => !!fileHandler.file.value && isImageFile(fileHandler.file.value))

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
    if (hasUploadedImageFile.value && addDataUri.value && !fileBase64.value.startsWith('data:')) {
      const mime = fileHandler.file.value.type || 'image/png'
      return `data:${mime};base64,` + fileBase64.value
    }
    return fileBase64.value
  }
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

function switchMode() {
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
  fileHandler.removeFile(); fileBase64.value = ''; input.value = ''; result.value = ''; isLargeDecode.value = false; encodeError.value = ''; cleanupPreview()
}
function handleFileUpload(e: Event) { const file = (e.target as HTMLInputElement).files?.[0]; if (file) setFile(file) }
function setFile(f: File) {
  encodeError.value = ''
  if (!fileHandler.setFile(f)) { encodeError.value = fileHandler.error.value; return }
  input.value = ''
  const reader = new FileReader()
  reader.onload = () => { const res = reader.result; if (typeof res !== 'string') return; fileBase64.value = res.split(',')[1] || ''; if (mode.value === 'decode') result.value = fileBase64.value }
  reader.readAsDataURL(f)
}
function removeFile() { fileHandler.removeFile(); fileBase64.value = ''; input.value = ''; result.value = ''; encodeError.value = ''; addDataUri.value = false }
function triggerFile() { if (fileInput.value) fileInput.value.value = ''; fileInput.value?.click() }
function downloadImage() {
  const src = fileHandler.file.value ? uploadedImageSrc.value : imgPreview.value
  if (!src) return
  const link = document.createElement('a'); link.href = src; link.download = 'decoded-image' + extFromMime(guessMimeFromBase64(input.value || '')); link.click()
}
onUnmounted(() => cleanupPreview())
</script>

<template>
  <ToolPage name="base64" max-width="6xl" icon="i-lucide-binary">
    <div class="tool-workspace">
      <ToolSection title="输入" description="选择编码或解码模式，支持文本和文件输入。">
      <template #actions>
        <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
      </template>
      <div class="mb-4 flex items-center gap-3 flex-wrap justify-between">
        <div class="flex items-center gap-3 flex-wrap">
          <UTabs v-model="mode" :items="[{ label: '编码', value: 'encode' }, { label: '解码', value: 'decode' }]" color="success" />
          <UButton color="neutral" variant="ghost" @click="switchMode" class="rounded-full" icon="i-lucide-arrow-right-left" title="交换" />
          <UButton
            v-if="mode === 'encode'"
            color="neutral" variant="ghost"
            @click="triggerFile"
            class="rounded-full text-xs text-primary hover:bg-primary/10"
            icon="i-lucide-file-up"
          >文件转 Base64</UButton>
          <input ref="fileInput" type="file" accept="*/*" class="hidden" @change="handleFileUpload" />
          <UButton
            v-if="mode === 'decode' && isImageResult"
            color="neutral" variant="ghost"
            @click="downloadDecodedFile"
            class="rounded-full text-xs text-primary hover:bg-primary/10"
            icon="i-lucide-download"
          >下载文件</UButton>
          <UCheckbox v-if="mode === 'encode' && hasUploadedImageFile" v-model="addDataUri" label="Data URI 前缀" color="success" />
        </div>
      </div>

      <div v-if="fileHandler.file.value && mode === 'encode'" class="mb-4 flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
        <div class="min-w-0">
          <div class="truncate text-sm font-medium">{{ fileHandler.file.value.name }}</div>
          <div class="text-xs text-muted">{{ fileHandler.formatSize(fileHandler.file.value.size) }}</div>
        </div>
        <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="removeFile" class="rounded-full" />
      </div>

      <UTextarea
        v-if="!fileHandler.file.value"
        v-model="input"
        @blur="saveHistory"
        :placeholder="mode === 'encode' ? '输入要编码的文本...' : '输入要解码的 Base64（支持大图片直接粘贴）'"
        :rows="10"
        class="w-full"
      />

      <UAlert v-if="encodeError" class="mt-3" color="error" variant="soft" icon="i-lucide-circle-alert" :description="encodeError" />

      <div v-if="showPreview" class="mt-4 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">图片预览</span>
          <UButton color="neutral" variant="ghost" icon="i-lucide-download" @click="downloadImage" class="rounded-full text-xs">下载</UButton>
        </div>
        <div class="flex items-center justify-center rounded-xl bg-elevated p-4">
          <img :src="imgPreview" class="max-h-64 max-w-full rounded-lg object-contain" @error="onImgError" />
        </div>
      </div>

        <ResultPanel v-if="finalResult" class="mt-4 lg:hidden" title="结果" :value="finalResult" pre-wrap compact max-height="260px">
          {{ resultDisplay }}
        </ResultPanel>
      </ToolSection>

      <div class="hidden lg:block tool-preview-sticky">
        <ResultPanel v-if="finalResult" title="结果" :value="finalResult" pre-wrap max-height="520px">
          {{ resultDisplay }}
        </ResultPanel>
        <ResultPanel v-else title="结果" value="" empty-text="等待输入..." />
      </div>
    </div>
  </ToolPage>
</template>
