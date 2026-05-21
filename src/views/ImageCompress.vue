<script setup lang="ts">
import { ref, computed } from 'vue'
import { Upload, Download, Image } from '@lucide/vue'
import { usePersistedRef } from '@/utils/persist'
import { compressImageFile } from '@/utils/imageCompression'

const originalFile = ref<File | null>(null)
const compressedFile = ref<File | null>(null)
const quality = usePersistedRef('web-tools:imgcompress:quality', 0.8)
const maxWidth = usePersistedRef('web-tools:imgcompress:max-width', 1920)
const maxHeight = usePersistedRef('web-tools:imgcompress:max-height', 1080)
const loading = ref(false)
const error = ref('')

const MAX_IMAGE_BYTES = 30 * 1024 * 1024

const originalSize = computed(() => {
  if (!originalFile.value) return '-'
  return formatSize(originalFile.value.size)
})
const compressedSize = computed(() => {
  if (!compressedFile.value) return '-'
  return formatSize(compressedFile.value.size)
})
const ratio = computed(() => {
  if (!originalFile.value || !compressedFile.value) return '-'
  const r = (1 - compressedFile.value.size / originalFile.value.size) * 100
  return r.toFixed(1) + '%'
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setImageFile(file)
}

function setImageFile(file: File) {
  error.value = ''
  if (!file.type.startsWith('image/')) {
    error.value = '请上传图片文件。'
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    error.value = `图片超过 ${formatSize(MAX_IMAGE_BYTES)}，为避免浏览器卡顿已拒绝处理。`
    return
  }
  originalFile.value = file
  compressedFile.value = null
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) setImageFile(file)
}

function triggerUpload() {
  const el = document.getElementById('img-upload') as HTMLInputElement | null
  if (el) el.value = ''
  el?.click()
}

async function compress() {
  if (!originalFile.value) return
  loading.value = true
  error.value = ''
  try {
    const options = {
      maxWidthOrHeight: Math.min(Math.max(maxWidth.value, maxHeight.value), 4096),
      initialQuality: Math.min(Math.max(quality.value, 0.1), 1),
    }
    const file = await compressImageFile(originalFile.value, options)
    compressedFile.value = file
  } catch (e: any) {
    error.value = '压缩失败: ' + (e.message || e)
  } finally {
    loading.value = false
  }
}

function download() {
  if (!compressedFile.value) return
  const url = URL.createObjectURL(compressedFile.value)
  const link = document.createElement('a')
  link.download = compressedFile.value.name
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div
      class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4"
    >
      <div class="flex items-center justify-center">
        <button
          @click="triggerUpload"
          @dragover.prevent
          @drop="handleDrop"
          class="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-outline p-8 transition-colors hover:border-primary hover:bg-primary-container/30"
        >
          <Upload class="h-8 w-8 text-primary" />
          <span class="text-sm font-medium text-on-surface">点击或拖拽上传图片</span>
          <span class="text-xs text-on-surface-variant">支持 JPG, PNG, WebP 等格式</span>
        </button>
        <input id="img-upload" type="file" accept="image/*" class="hidden" @change="handleFile" />
      </div>
      <div v-if="error" class="text-sm text-error">{{ error }}</div>

      <div v-if="originalFile" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="rounded-xl bg-surface-variant/50 p-3">
          <div class="text-xs text-on-surface-variant">原图大小</div>
          <div class="mt-1 text-lg font-medium text-on-surface">{{ originalSize }}</div>
        </div>
        <div class="rounded-xl bg-surface-variant/50 p-3">
          <div class="text-xs text-on-surface-variant">压缩后</div>
          <div class="mt-1 text-lg font-medium text-on-surface">{{ compressedSize }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label class="mb-1 block text-sm text-on-surface-variant">最大宽度</label>
          <input
            v-model.number="maxWidth"
            type="number"
            class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-on-surface-variant">最大高度</label>
          <input
            v-model.number="maxHeight"
            type="number"
            class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-on-surface-variant">质量</label>
          <input
            v-model.number="quality"
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            class="h-10 w-full"
          />
          <div class="text-right text-xs text-on-surface-variant">
            {{ (quality * 100).toFixed(0) }}%
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button
          @click="compress"
          :disabled="loading || !originalFile"
          class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Image class="h-4 w-4" />
          {{ loading ? '压缩中...' : '开始压缩' }}
        </button>
        <button
          v-if="compressedFile"
          @click="download"
          class="flex items-center gap-2 rounded-full bg-secondary-container px-5 py-2.5 text-sm font-medium text-on-secondary-container hover:bg-secondary-container/80 transition-colors"
        >
          <Download class="h-4 w-4" />
          下载
        </button>
      </div>

      <div v-if="compressedFile && ratio !== '-'" class="text-sm text-on-surface-variant">
        压缩率: <span class="font-medium text-primary">{{ ratio }}</span>
      </div>
    </div>
  </div>
</template>
