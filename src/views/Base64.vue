<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Copy, Check, ArrowRightLeft, FileUp, X, Download } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'

const mode = ref<'encode' | 'decode'>('encode')
const input = ref('')
const copied = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const imgPreview = ref('')
const showPreview = ref(false)
const addDataUri = ref(false)
const uploadedFile = ref<File | null>(null)
const fileBase64 = ref('')

function isValidBase64(s: string): boolean {
  try {
    return /^[A-Za-z0-9+/]*={0,2}$/.test(s.replace(/\s/g, ''))
  } catch {
    return false
  }
}

function looksLikeImageBase64(s: string): boolean {
  const clean = s.trim().replace(/\s/g, '')
  if (clean.startsWith('data:image')) return true
  try {
    const head = atob(clean.slice(0, 24))
    return head.includes('PNG') || head.includes('JFIF') || head.includes('GIF') || head.startsWith('\x89')
  } catch {
    return false
  }
}

function updatePreview() {
  if (mode.value !== 'decode' || !input.value) {
    showPreview.value = false
    return
  }
  const clean = input.value.trim().replace(/\s/g, '')
  let src = clean
  if (!src.startsWith('data:image')) {
    src = 'data:image/png;base64,' + src
  }
  imgPreview.value = src
  showPreview.value = looksLikeImageBase64(input.value)
}

function onImgError() {
  showPreview.value = false
}

watch([input, mode], () => {
  updatePreview()
})

const textResult = computed(() => {
  if (!input.value) return ''
  try {
    if (mode.value === 'encode') {
      return btoa(unescape(encodeURIComponent(input.value)))
    } else {
      const clean = input.value.trim().replace(/\s/g, '')
      if (clean.startsWith('data:image')) {
        return clean.split(',')[1] || clean
      }
      if (looksLikeImageBase64(clean)) {
        return clean
      }
      if (clean.length > 500000) {
        return '输入过长（疑似二进制数据），已跳过文本解码，请查看图片预览或直接复制'
      }
      return decodeURIComponent(escape(atob(clean)))
    }
  } catch {
    return '转换失败，请检查输入内容'
  }
})

const finalResult = computed(() => {
  if (uploadedFile.value) {
    if (addDataUri.value && !fileBase64.value.startsWith('data:')) {
      return 'data:image/png;base64,' + fileBase64.value
    }
    return fileBase64.value
  }
  if (mode.value === 'encode' && addDataUri.value && textResult.value) {
    return 'data:text/plain;base64,' + textResult.value
  }
  return textResult.value
})

const isImageResult = computed(() => {
  const src = uploadedFile.value ? fileBase64.value : input.value
  return mode.value === 'decode' && looksLikeImageBase64(src)
})

async function copyResult() {
  const val = finalResult.value
  if (!val) return
  const ok = await copyToClipboard(val)
  if (!ok) return
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function switchMode() {
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
  uploadedFile.value = null
  fileBase64.value = ''
  input.value = textResult.value
}

function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  setFile(file)
}

function setFile(file: File) {
  uploadedFile.value = file
  const reader = new FileReader()
  reader.onload = () => {
    const res = reader.result
    if (typeof res !== 'string') return
    fileBase64.value = res.split(',')[1] || ''
  }
  reader.readAsDataURL(file)
}

function removeFile() {
  uploadedFile.value = null
  fileBase64.value = ''
}

function triggerFile() {
  if (fileInput.value) fileInput.value.value = ''
  fileInput.value?.click()
}

function downloadImage() {
  const src = uploadedFile.value
    ? (addDataUri.value ? 'data:image/png;base64,' + fileBase64.value : fileBase64.value)
    : imgPreview.value
  if (!src) return
  const link = document.createElement('a')
  link.href = src.startsWith('data:') ? src : 'data:image/png;base64,' + src
  link.download = 'decoded-image.png'
  link.click()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="mb-4 flex items-center gap-3 flex-wrap">
        <div class="inline-flex rounded-full bg-surface-variant p-1">
          <button
            @click="mode = 'encode'"
            class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            :class="mode === 'encode' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'"
          >
            编码
          </button>
          <button
            @click="mode = 'decode'"
            class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            :class="mode === 'decode' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'"
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
          @click="triggerFile"
          class="ml-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-primary hover:bg-primary-container transition-colors"
        >
          <FileUp class="h-4 w-4" />
          文件转 Base64
        </button>
        <input ref="fileInput" type="file" class="hidden" @change="handleFileUpload" />
      </div>

      <!-- 文本输入 -->
      <textarea
        v-if="!uploadedFile"
        v-model="input"
        :placeholder="mode === 'encode' ? '输入要编码的文本...' : '输入要解码的 Base64...'"
        class="h-40 w-full resize-none rounded-xl border border-outline bg-surface p-4 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

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
          <label v-if="mode === 'encode' || uploadedFile" class="flex cursor-pointer items-center gap-1.5 text-xs text-on-surface-variant">
            <input v-model="addDataUri" type="checkbox" class="h-3.5 w-3.5 accent-primary" />
            data:image 前缀
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
            v-if="finalResult && !(mode === 'decode' && isImageResult && !uploadedFile)"
            @click="copyResult"
            class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
          >
            <Check v-if="copied" class="h-3.5 w-3.5" />
            <Copy v-else class="h-3.5 w-3.5" />
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>
      </div>
      <div v-if="!(mode === 'decode' && isImageResult && !uploadedFile)" class="break-all rounded-xl bg-surface-variant/50 p-4 font-mono text-sm text-on-surface">
        {{ finalResult || '等待输入...' }}
      </div>
      <div v-if="(showPreview && mode === 'decode') || (uploadedFile && isImageResult)" class="mt-4">
        <div class="mb-2 text-xs font-medium text-on-surface-variant">图片预览</div>
        <img
          :src="uploadedFile ? (addDataUri ? 'data:image/png;base64,' + fileBase64 : fileBase64) : imgPreview"
          class="max-h-64 rounded-xl object-contain"
          @error="onImgError"
        />
      </div>
    </div>
  </div>
</template>
