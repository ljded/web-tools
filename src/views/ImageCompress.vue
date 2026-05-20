<script setup lang="ts">
import { ref, computed } from 'vue'
import imageCompression from 'browser-image-compression'
import { Upload, Download, Image } from '@lucide/vue'

const originalFile = ref<File | null>(null)
const originalUrl = ref('')
const compressedUrl = ref('')
const compressedFile = ref<File | null>(null)
const quality = ref(0.8)
const maxWidth = ref(1920)
const maxHeight = ref(1080)
const lossless = ref(false)
const loading = ref(false)

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
  if (!file) return
  originalFile.value = file
  originalUrl.value = URL.createObjectURL(file)
  compressedUrl.value = ''
  compressedFile.value = null
}

function triggerUpload() {
  const el = document.getElementById('img-upload') as HTMLInputElement | null
  if (el) el.value = ''
  el?.click()
}

async function compress() {
  if (!originalFile.value) return
  loading.value = true
  try {
    if (lossless.value) {
      // 无损：仅限制尺寸，使用 canvas 重新绘制为 PNG
      const img = document.createElement('img')
      img.src = originalUrl.value
      await new Promise((res) => { img.onload = res })
      const canvas = document.createElement('canvas')
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > maxWidth.value) { h = Math.round(h * maxWidth.value / w); w = maxWidth.value }
      if (h > maxHeight.value) { w = Math.round(w * maxHeight.value / h); h = maxHeight.value }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'))
      compressedFile.value = new File([blob], originalFile.value.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' })
      compressedUrl.value = URL.createObjectURL(compressedFile.value)
    } else {
      // 有损压缩
      const options = {
        maxWidthOrHeight: Math.max(maxWidth.value, maxHeight.value),
        useWebWorker: true,
        initialQuality: quality.value,
      }
      const file = await imageCompression(originalFile.value, options)
      compressedFile.value = file
      compressedUrl.value = URL.createObjectURL(file)
    }
  } catch (e: any) {
    alert('压缩失败: ' + (e.message || e))
  } finally {
    loading.value = false
  }
}

function download() {
  if (!compressedUrl.value || !compressedFile.value) return
  const link = document.createElement('a')
  link.download = compressedFile.value.name
  link.href = compressedUrl.value
  link.click()
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <div class="flex items-center justify-center">
        <button
          @click="triggerUpload"
          class="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-outline p-8 transition-colors hover:border-primary hover:bg-primary-container/30"
        >
          <Upload class="h-8 w-8 text-primary" />
          <span class="text-sm font-medium text-on-surface">点击上传图片</span>
          <span class="text-xs text-on-surface-variant">支持 JPG, PNG, WebP 等格式</span>
        </button>
        <input id="img-upload" type="file" accept="image/*" class="hidden" @change="handleFile" />
      </div>

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
          <input v-model.number="maxWidth" type="number" class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-on-surface-variant">最大高度</label>
          <input v-model.number="maxHeight" type="number" class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-on-surface-variant">质量 (有损)</label>
          <input v-model.number="quality" type="range" min="0.1" max="1" step="0.05" class="h-10 w-full" />
          <div class="text-right text-xs text-on-surface-variant">{{ (quality * 100).toFixed(0) }}%</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <label class="flex cursor-pointer items-center gap-2 text-sm text-on-surface">
          <input v-model="lossless" type="checkbox" class="h-4 w-4 accent-primary" />
          无损压缩 (转为 PNG，仅限制尺寸)
        </label>
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
          v-if="compressedUrl"
          @click="download"
          class="flex items-center gap-2 rounded-full bg-secondary-container px-5 py-2.5 text-sm font-medium text-on-secondary-container hover:bg-secondary-container/80 transition-colors"
        >
          <Download class="h-4 w-4" />
          下载
        </button>
      </div>

      <div v-if="compressedUrl && ratio !== '-'" class="text-sm text-on-surface-variant">
        压缩率: <span class="font-medium text-primary">{{ ratio }}</span>
      </div>
    </div>

    <div v-if="originalUrl || compressedUrl" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="rounded-2xl bg-surface p-4 shadow-sm outline outline-1 outline-outline-variant">
        <div class="mb-2 text-sm font-medium text-on-surface-variant">原图</div>
        <img v-if="originalUrl" :src="originalUrl" class="w-full rounded-xl object-contain" />
      </div>
      <div class="rounded-2xl bg-surface p-4 shadow-sm outline outline-1 outline-outline-variant">
        <div class="mb-2 text-sm font-medium text-on-surface-variant">压缩后</div>
        <img v-if="compressedUrl" :src="compressedUrl" class="w-full rounded-xl object-contain" />
      </div>
    </div>
  </div>
</template>
