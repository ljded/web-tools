<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Upload,
  Download,
  Image as ImageIcon,
  Trash2,
  RotateCw,
  Scissors,
  Type,
  Palette,
  Maximize,
  FileImage,
} from '@lucide/vue'
import { usePersistedRef } from '@/utils/persist'
import { compressImageFile } from '@/utils/imageCompression'

interface FileItem {
  file: File
  preview: string
  loading?: boolean
  processing?: boolean
  resultFile?: File
  resultUrl?: string
  resultName?: string
  ratio?: string
  error?: string
}

const files = ref<FileItem[]>([])

const batchOp = usePersistedRef<'compress' | 'format' | 'resize' | 'watermark' | 'rotate' | 'crop'>(
  'web-tools:image:batch-op',
  'compress',
)

// compress
const quality = usePersistedRef('web-tools:image:quality', 0.8)
const maxWidth = usePersistedRef('web-tools:image:max-width', 1920)
const maxHeight = usePersistedRef('web-tools:image:max-height', 1080)

// format
const targetFormat = usePersistedRef<'image/png' | 'image/jpeg' | 'image/webp'>(
  'web-tools:image:target-format',
  'image/jpeg',
)

// resize
const resizeWidth = usePersistedRef('web-tools:image:resize-width', 800)
const resizeHeight = usePersistedRef('web-tools:image:resize-height', 600)
const keepRatio = usePersistedRef('web-tools:image:keep-ratio', true)

// watermark
const wmText = usePersistedRef('web-tools:image:wm-text', 'Watermark')
const wmSize = usePersistedRef('web-tools:image:wm-size', 24)
const wmColor = usePersistedRef('web-tools:image:wm-color', '#ffffff')
const wmOpacity = usePersistedRef('web-tools:image:wm-opacity', 0.5)
const wmPos = usePersistedRef<'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>(
  'web-tools:image:wm-pos',
  'bottom-right',
)

// rotate
const rotateDeg = usePersistedRef<90 | 180 | 270>('web-tools:image:rotate-deg', 90)

// crop
const cropTop = usePersistedRef('web-tools:image:crop-top', 0)
const cropBottom = usePersistedRef('web-tools:image:crop-bottom', 0)
const cropLeft = usePersistedRef('web-tools:image:crop-left', 0)
const cropRight = usePersistedRef('web-tools:image:crop-right', 0)

function triggerUpload() {
  const el = document.getElementById('image-upload') as HTMLInputElement | null
  if (el) el.value = ''
  el?.click()
}

function addFiles(fileList: File[]) {
  const valid = fileList.filter((f) => f.type.startsWith('image/'))
  valid.forEach((file) => {
    const reader = new FileReader()
    reader.onload = () => {
      files.value.push({ file, preview: reader.result as string })
    }
    reader.readAsDataURL(file)
  })
}

function handleFiles(e: Event) {
  addFiles(Array.from((e.target as HTMLInputElement).files || []))
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  addFiles(Array.from(e.dataTransfer?.files || []))
}

function removeItem(idx: number) {
  const item = files.value[idx]
  if (item?.resultUrl) URL.revokeObjectURL(item.resultUrl)
  files.value.splice(idx, 1)
}

async function processAll() {
  if (!files.value.length) return

  if (batchOp.value === 'compress') {
    for (let i = 0; i < files.value.length; i++) {
      const item = files.value[i]!
      if (item.resultFile || item.loading) continue
      item.loading = true
      item.error = ''
      try {
        const options = {
          maxWidthOrHeight: Math.min(Math.max(maxWidth.value, maxHeight.value), 4096),
          initialQuality: Math.min(Math.max(quality.value, 0.1), 1),
        }
        const file = await compressImageFile(item.file, options)
        item.resultFile = file
        item.resultUrl = URL.createObjectURL(file)
        item.resultName = item.file.name.replace(/\.[^.]+$/, '') + '_compressed.jpg'
        const r = (1 - file.size / item.file.size) * 100
        item.ratio = r.toFixed(1) + '%'
      } catch (e: any) {
        item.error = '失败'
      } finally {
        item.loading = false
      }
    }
  } else {
    files.value.forEach((item) => {
      if (item.processing) return
      if (item.resultUrl) {
        URL.revokeObjectURL(item.resultUrl)
        item.resultUrl = undefined
        item.resultName = undefined
        item.resultFile = undefined
        item.ratio = undefined
      }
      item.processing = true
      item.error = ''
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        let w = img.width
        let h = img.height

        if (batchOp.value === 'resize') {
          if (keepRatio.value) {
            const ratio = Math.min(resizeWidth.value / w, resizeHeight.value / h)
            w = Math.round(w * ratio)
            h = Math.round(h * ratio)
          } else {
            w = resizeWidth.value
            h = resizeHeight.value
          }
          canvas.width = w
          canvas.height = h
          ctx.drawImage(img, 0, 0, w, h)
        } else if (batchOp.value === 'rotate') {
          const deg = rotateDeg.value
          if (deg === 90 || deg === 270) {
            canvas.width = h
            canvas.height = w
          } else {
            canvas.width = w
            canvas.height = h
          }
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate((deg * Math.PI) / 180)
          ctx.drawImage(img, -w / 2, -h / 2)
        } else if (batchOp.value === 'crop') {
          const sx = Math.min(cropLeft.value, w - 1)
          const sy = Math.min(cropTop.value, h - 1)
          const sw = Math.max(1, w - sx - cropRight.value)
          const sh = Math.max(1, h - sy - cropBottom.value)
          canvas.width = sw
          canvas.height = sh
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
          w = sw
          h = sh
        } else {
          canvas.width = w
          canvas.height = h
          ctx.drawImage(img, 0, 0)
        }

        if (batchOp.value === 'watermark') {
          ctx.save()
          ctx.globalAlpha = Math.min(Math.max(wmOpacity.value, 0), 1)
          ctx.fillStyle = wmColor.value
          ctx.font = `${wmSize.value}px sans-serif`
          const metrics = ctx.measureText(wmText.value)
          const tw = metrics.width
          const th = wmSize.value
          let x = 0
          let y = 0
          const padding = 16
          switch (wmPos.value) {
            case 'top-left':
              x = padding
              y = padding + th
              break
            case 'top-right':
              x = w - tw - padding
              y = padding + th
              break
            case 'bottom-left':
              x = padding
              y = h - padding
              break
            case 'bottom-right':
              x = w - tw - padding
              y = h - padding
              break
            case 'center':
              x = (w - tw) / 2
              y = (h + th) / 2
              break
          }
          ctx.fillText(wmText.value, x, y)
          ctx.restore()
        }

        const outFormat = batchOp.value === 'format' ? targetFormat.value : item.file.type
        const ext = outFormat === 'image/png' ? 'png' : outFormat === 'image/webp' ? 'webp' : 'jpg'
        const baseName = item.file.name.replace(/\.[^.]+$/, '')
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              item.error = '导出失败'
              item.processing = false
              return
            }
            item.resultUrl = URL.createObjectURL(blob)
            item.resultName = `${baseName}_${batchOp.value}.${ext}`
            item.processing = false
          },
          outFormat,
          0.92,
        )
      }
      img.onerror = () => {
        item.error = '加载失败'
        item.processing = false
      }
      img.src = item.preview
    })
  }
}

function downloadItem(item: FileItem) {
  if (!item.resultUrl) return
  const link = document.createElement('a')
  link.download = item.resultName || 'image.png'
  link.href = item.resultUrl
  link.click()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const batchOpLabel = computed(() => {
  const map: Record<string, string> = {
    compress: '图片压缩',
    format: '格式转换',
    resize: '尺寸修改',
    watermark: '添加水印',
    rotate: '旋转',
    crop: '裁剪',
  }
  return map[batchOp.value] || batchOp.value
})
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <!-- 操作选择 -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="op in [
          { key: 'compress', label: '图片压缩', icon: FileImage },
          { key: 'format', label: '格式转换', icon: FileImage },
          { key: 'resize', label: '尺寸修改', icon: Maximize },
          { key: 'watermark', label: '添加水印', icon: Type },
          { key: 'rotate', label: '旋转', icon: RotateCw },
          { key: 'crop', label: '裁剪', icon: Scissors },
        ] as const"
        :key="op.key"
        @click="batchOp = op.key"
        class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        :class="
          batchOp === op.key
            ? 'bg-secondary-container text-on-secondary-container'
            : 'bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80'
        "
      >
        <component :is="op.icon" class="h-3.5 w-3.5" />
        {{ op.label }}
      </button>
    </div>

    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant flex flex-col gap-4">
      <!-- 上传 -->
      <div class="flex items-center justify-center">
        <button
          @click="triggerUpload"
          @dragover.prevent
          @drop="handleDrop"
          class="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-outline p-8 transition-colors hover:border-primary hover:bg-primary-container/30"
        >
          <Upload class="h-8 w-8 text-primary" />
          <span class="text-sm font-medium text-on-surface">点击或拖拽上传图片</span>
          <span class="text-xs text-on-surface-variant">支持批量上传</span>
        </button>
        <input id="image-upload" type="file" accept="image/*" multiple class="hidden" @change="handleFiles" />
      </div>

      <!-- 参数区 -->
      <div class="rounded-xl bg-surface-variant/30 p-4 flex flex-col gap-3">
        <div class="text-xs font-medium text-on-surface-variant">{{ batchOpLabel }}参数</div>

        <!-- 压缩 -->
        <div v-if="batchOp === 'compress'" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <input v-model.number="quality" type="range" min="0.1" max="1" step="0.05" class="h-10 w-full" />
            <div class="text-right text-xs text-on-surface-variant">{{ (quality * 100).toFixed(0) }}%</div>
          </div>
        </div>

        <!-- 格式转换 -->
        <div v-if="batchOp === 'format'" class="flex items-center gap-3">
          <label class="text-sm text-on-surface">目标格式</label>
          <select
            v-model="targetFormat"
            class="h-10 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp">WebP</option>
          </select>
        </div>

        <!-- 尺寸 -->
        <div v-if="batchOp === 'resize'" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label class="mb-1 block text-xs text-on-surface-variant">目标宽度</label>
            <input
              v-model.number="resizeWidth"
              type="number"
              min="1"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-on-surface-variant">目标高度</label>
            <input
              v-model.number="resizeHeight"
              type="number"
              min="1"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none"
            />
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-sm text-on-surface">
              <input v-model="keepRatio" type="checkbox" class="h-4 w-4 accent-primary" />
              保持比例
            </label>
          </div>
        </div>

        <!-- 水印 -->
        <div v-if="batchOp === 'watermark'" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs text-on-surface-variant">水印文字</label>
            <input
              v-model="wmText"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-on-surface-variant">位置</label>
            <select
              v-model="wmPos"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none"
            >
              <option value="center">居中</option>
              <option value="top-left">左上</option>
              <option value="top-right">右上</option>
              <option value="bottom-left">左下</option>
              <option value="bottom-right">右下</option>
            </select>
          </div>
          <div class="flex items-center gap-3">
            <label class="text-xs text-on-surface-variant">颜色</label>
            <input v-model="wmColor" type="color" class="h-8 w-8 rounded border border-outline bg-transparent p-0.5" />
            <span class="text-xs text-on-surface">{{ wmColor }}</span>
          </div>
          <div>
            <label class="mb-1 block text-xs text-on-surface-variant">字号: {{ wmSize }}px</label>
            <input v-model.number="wmSize" type="range" min="12" max="120" class="h-6 w-full" />
          </div>
          <div>
            <label class="mb-1 block text-xs text-on-surface-variant">
              透明度: {{ (wmOpacity * 100).toFixed(0) }}%
            </label>
            <input v-model.number="wmOpacity" type="range" min="0.05" max="1" step="0.05" class="h-6 w-full" />
          </div>
        </div>

        <!-- 旋转 -->
        <div v-if="batchOp === 'rotate'" class="flex items-center gap-3">
          <label v-for="d in [90, 180, 270] as const" :key="d" class="flex items-center gap-1.5 text-sm text-on-surface">
            <input v-model.number="rotateDeg" type="radio" :value="d" class="accent-primary" />
            {{ d }}°
          </label>
        </div>

        <!-- 裁剪 -->
        <div v-if="batchOp === 'crop'" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label class="mb-1 block text-xs text-on-surface-variant">顶部 (px)</label>
            <input
              v-model.number="cropTop"
              type="number"
              min="0"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-on-surface-variant">底部 (px)</label>
            <input
              v-model.number="cropBottom"
              type="number"
              min="0"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-on-surface-variant">左侧 (px)</label>
            <input
              v-model.number="cropLeft"
              type="number"
              min="0"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-on-surface-variant">右侧 (px)</label>
            <input
              v-model.number="cropRight"
              type="number"
              min="0"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none"
            />
          </div>
        </div>
      </div>

      <button
        @click="processAll"
        :disabled="!files.length"
        class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <ImageIcon class="h-4 w-4" />
        {{ batchOp === 'compress' ? '开始批量压缩' : '开始处理' }}
      </button>

      <!-- 文件列表 -->
      <div v-if="files.length" class="space-y-3">
        <div
          v-for="(item, idx) in files"
          :key="idx"
          class="flex items-center gap-3 rounded-xl bg-surface-variant/30 px-4 py-3"
        >
          <img :src="item.preview" class="h-12 w-12 rounded-lg object-cover" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-on-surface">{{ item.file.name }}</div>
            <div class="text-xs text-on-surface-variant">
              <template v-if="batchOp === 'compress'">
                原 {{ formatSize(item.file.size) }}
                <span v-if="item.resultFile">
                  → 压缩后 {{ formatSize(item.resultFile.size) }} ({{ item.ratio }})
                </span>
                <span v-else-if="item.loading" class="text-primary">压缩中...</span>
                <span v-else-if="item.error" class="text-error">{{ item.error }}</span>
              </template>
              <template v-else>
                <span v-if="item.processing" class="text-primary">处理中...</span>
                <span v-else-if="item.error" class="text-error">{{ item.error }}</span>
                <span v-else-if="item.resultUrl" class="text-green-600">已完成</span>
                <span v-else>待处理</span>
              </template>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="item.resultUrl"
              @click="downloadItem(item)"
              class="rounded-full p-1.5 hover:bg-surface-variant text-primary"
              title="下载"
            >
              <Download class="h-4 w-4" />
            </button>
            <button
              @click="removeItem(idx)"
              class="rounded-full p-1.5 hover:bg-surface-variant text-on-surface-variant"
              title="移除"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
