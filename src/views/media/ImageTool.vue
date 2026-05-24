<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePersistedRef } from '@/utils/persist'
import { compressImageFile } from '@/utils/imageCompression'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'

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

const batchOp = usePersistedRef<'compress' | 'format' | 'resize' | 'watermark' | 'rotate' | 'crop'>('web-tools:image:batch-op', 'compress')

const quality = usePersistedRef('web-tools:image:quality', 0.8)
const maxWidth = usePersistedRef('web-tools:image:max-width', 1920)
const maxHeight = usePersistedRef('web-tools:image:max-height', 1080)

const targetFormat = usePersistedRef<'image/png' | 'image/jpeg' | 'image/webp'>('web-tools:image:target-format', 'image/jpeg')

const resizeWidth = usePersistedRef('web-tools:image:resize-width', 800)
const resizeHeight = usePersistedRef('web-tools:image:resize-height', 600)
const keepRatio = usePersistedRef('web-tools:image:keep-ratio', true)

const wmText = usePersistedRef('web-tools:image:wm-text', 'Watermark')
const wmSize = usePersistedRef('web-tools:image:wm-size', 24)
const wmColor = usePersistedRef('web-tools:image:wm-color', '#ffffff')
const wmOpacity = usePersistedRef('web-tools:image:wm-opacity', 0.5)
const wmPos = usePersistedRef<'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('web-tools:image:wm-pos', 'bottom-right')

const rotateDeg = usePersistedRef<90 | 180 | 270>('web-tools:image:rotate-deg', 90)

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
    reader.onload = () => { files.value.push({ file, preview: reader.result as string }) }
    reader.readAsDataURL(file)
  })
}

function handleFiles(e: Event) { addFiles(Array.from((e.target as HTMLInputElement).files || [])) }
function handleDrop(e: DragEvent) { e.preventDefault(); addFiles(Array.from(e.dataTransfer?.files || [])) }
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
      item.loading = true; item.error = ''
      try {
        const options = {
          maxWidthOrHeight: Math.min(Math.max(maxWidth.value, maxHeight.value), 4096),
          initialQuality: Math.min(Math.max(quality.value, 0.1), 1),
        }
        const file = await compressImageFile(item.file, options)
        item.resultFile = file; item.resultUrl = URL.createObjectURL(file)
        item.resultName = item.file.name.replace(/\.[^.]+$/, '') + '_compressed.jpg'
        const r = (1 - file.size / item.file.size) * 100
        item.ratio = r.toFixed(1) + '%'
      } catch (e: any) { item.error = '失败' }
      finally { item.loading = false }
    }
  } else {
    files.value.forEach((item) => {
      if (item.processing) return
      if (item.resultUrl) { URL.revokeObjectURL(item.resultUrl); item.resultUrl = undefined; item.resultName = undefined; item.resultFile = undefined; item.ratio = undefined }
      item.processing = true; item.error = ''
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        let w = img.width, h = img.height

        if (batchOp.value === 'resize') {
          if (keepRatio.value) { const ratio = Math.min(resizeWidth.value / w, resizeHeight.value / h); w = Math.round(w * ratio); h = Math.round(h * ratio) }
          else { w = resizeWidth.value; h = resizeHeight.value }
          canvas.width = w; canvas.height = h
          ctx.drawImage(img, 0, 0, w, h)
        } else if (batchOp.value === 'rotate') {
          const deg = rotateDeg.value
          if (deg === 90 || deg === 270) { canvas.width = h; canvas.height = w }
          else { canvas.width = w; canvas.height = h }
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate((deg * Math.PI) / 180)
          ctx.drawImage(img, -w / 2, -h / 2)
        } else if (batchOp.value === 'crop') {
          const sx = Math.min(cropLeft.value, w - 1), sy = Math.min(cropTop.value, h - 1)
          const sw = Math.max(1, w - sx - cropRight.value), sh = Math.max(1, h - sy - cropBottom.value)
          canvas.width = sw; canvas.height = sh
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
          w = sw; h = sh
        } else { canvas.width = w; canvas.height = h; ctx.drawImage(img, 0, 0) }

        if (batchOp.value === 'watermark') {
          ctx.save(); ctx.globalAlpha = Math.min(Math.max(wmOpacity.value, 0), 1)
          ctx.fillStyle = wmColor.value
          ctx.font = `${wmSize.value}px sans-serif`
          const metrics = ctx.measureText(wmText.value); const tw = metrics.width; const th = wmSize.value
          let x = 0, y = 0; const padding = 16
          switch (wmPos.value) {
            case 'top-left': x = padding; y = padding + th; break
            case 'top-right': x = w - tw - padding; y = padding + th; break
            case 'bottom-left': x = padding; y = h - padding; break
            case 'bottom-right': x = w - tw - padding; y = h - padding; break
            case 'center': x = (w - tw) / 2; y = (h + th) / 2; break
          }
          ctx.fillText(wmText.value, x, y); ctx.restore()
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) { item.error = '导出失败'; item.processing = false; return }
            if (batchOp.value === 'format') {
              const extMap: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }
              item.resultName = item.file.name.replace(/\.[^.]+$/, '') + (extMap[targetFormat.value] || '.jpg')
            } else if (batchOp.value === 'resize') item.resultName = item.file.name.replace(/\.[^.]+$/, '') + '_resized.jpg'
            else if (batchOp.value === 'rotate') item.resultName = item.file.name.replace(/\.[^.]+$/, '') + '_rotated.jpg'
            else if (batchOp.value === 'crop') item.resultName = item.file.name.replace(/\.[^.]+$/, '') + '_cropped.jpg'
            else if (batchOp.value === 'watermark') item.resultName = item.file.name.replace(/\.[^.]+$/, '') + '_watermarked.jpg'
            item.resultFile = new File([blob], item.resultName || 'output.jpg', { type: batchOp.value === 'format' ? targetFormat.value : 'image/jpeg' })
            item.resultUrl = URL.createObjectURL(blob)
            item.processing = false
          },
          batchOp.value === 'format' ? targetFormat.value : 'image/jpeg',
          0.9,
        )
      }
      img.onerror = () => { item.error = '加载失败'; item.processing = false }
      img.src = item.preview
    })
  }
}

function downloadItem(item: FileItem) {
  if (!item.resultFile || !item.resultUrl) return
  const link = document.createElement('a')
  link.href = item.resultUrl; link.download = item.resultName || 'output.jpg'
  link.click()
}

const ops = [
  { value: 'compress' as const, label: '压缩', icon: 'i-lucide-minimize-2' },
  { value: 'format' as const, label: '转格式', icon: 'i-lucide-image' },
  { value: 'resize' as const, label: '缩放', icon: 'i-lucide-maximize' },
  { value: 'watermark' as const, label: '水印', icon: 'i-lucide-type' },
  { value: 'rotate' as const, label: '旋转', icon: 'i-lucide-rotate-cw' },
  { value: 'crop' as const, label: '裁剪', icon: 'i-lucide-scissors' },
]
</script>

<template>
  <ToolPage name="image" max-width="5xl">
    <template #actions>
      <UTabs v-model="batchOp" :items="ops.map(o => ({ label: o.label, value: o.value, icon: o.icon }))" />
    </template>

    <!-- 参数面板 -->
    <ToolSection title="处理参数" compact>
      <div class="flex flex-wrap items-end gap-4">
        <template v-if="batchOp === 'compress'">
          <UFormField label="质量">
            <USlider v-model="quality" :min="0.1" :max="1" :step="0.1" class="w-32" />
            <span class="text-xs text-muted">{{ Math.round(quality * 100) }}%</span>
          </UFormField>
          <UFormField label="最大宽高">
            <UInput v-model.number="maxWidth" class="w-24" />
          </UFormField>
        </template>

        <template v-if="batchOp === 'format'">
          <USelect v-model="targetFormat" :items="[{ label: 'JPEG', value: 'image/jpeg' }, { label: 'PNG', value: 'image/png' }, { label: 'WebP', value: 'image/webp' }]" label="目标格式" />
        </template>

        <template v-if="batchOp === 'resize'">
          <UFormField label="宽度"><UInput v-model.number="resizeWidth" class="w-24" /></UFormField>
          <UFormField label="高度"><UInput v-model.number="resizeHeight" class="w-24" /></UFormField>
          <UCheckbox v-model="keepRatio" label="保持比例" />
        </template>

        <template v-if="batchOp === 'watermark'">
          <UFormField label="文字"><UInput v-model="wmText" class="w-40" /></UFormField>
          <UFormField :label="`大小: ${wmSize}`"><USlider v-model="wmSize" :min="12" :max="72" :step="1" class="w-28" /></UFormField>
          <USelect v-model="wmPos" :items="[{ label: '居中', value: 'center' }, { label: '左上', value: 'top-left' }, { label: '右上', value: 'top-right' }, { label: '左下', value: 'bottom-left' }, { label: '右下', value: 'bottom-right' }]" label="位置" />
        </template>

        <template v-if="batchOp === 'rotate'">
          <USelect v-model="rotateDeg" :items="[{ label: '90°', value: 90 }, { label: '180°', value: 180 }, { label: '270°', value: 270 }]" label="旋转角度" />
        </template>

        <template v-if="batchOp === 'crop'">
          <div class="flex gap-2">
            <UFormField label="上"><UInput v-model.number="cropTop" class="w-20" /></UFormField>
            <UFormField label="右"><UInput v-model.number="cropRight" class="w-20" /></UFormField>
            <UFormField label="下"><UInput v-model.number="cropBottom" class="w-20" /></UFormField>
            <UFormField label="左"><UInput v-model.number="cropLeft" class="w-20" /></UFormField>
          </div>
        </template>
      </div>
    </ToolSection>

    <!-- 上传+处理 -->
    <ToolSection title="上传与处理" compact>
      <template #actions>
        <UButton color="primary" @click="processAll" :disabled="!files.length" class="rounded-full px-5 py-2.5 text-sm">
          <template #leading><UIcon name="i-lucide-play" class="size-4" /></template>全部处理
        </UButton>
      </template>
      <div
        class="flex h-32 items-center justify-center rounded-2xl border-2 border-dashed border-default p-4 transition-colors hover:border-primary"
        @dragover.prevent @drop="handleDrop"
        @click="triggerUpload"
      >
        <div class="text-center">
          <UIcon name="i-lucide-upload" class="mx-auto size-6 text-muted" />
          <span class="mt-1 block text-xs text-muted">拖拽图片或点击上传</span>
        </div>
        <input id="image-upload" type="file" accept="image/*" multiple class="hidden" @change="handleFiles" />
      </div>

      <div v-if="files.length" class="mt-4 space-y-3">
        <div v-for="(item, i) in files" :key="i" class="flex items-center gap-3 rounded-xl bg-elevated p-3">
          <img :src="item.preview" class="h-16 w-16 shrink-0 rounded-lg object-cover" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm">{{ item.file.name }}</div>
            <UBadge v-if="item.error" color="error" variant="soft" size="xs">{{ item.error }}</UBadge>
            <UBadge v-else-if="item.loading" color="info" variant="soft" size="xs">压缩中...</UBadge>
            <UBadge v-else-if="item.processing" color="info" variant="soft" size="xs">处理中...</UBadge>
            <div v-else-if="item.resultFile" class="text-xs text-success">
              已完成
              <span v-if="item.ratio" class="ml-1">(-{{ item.ratio }})</span>
            </div>
          </div>
          <UButton
            v-if="item.resultFile && item.resultUrl"
            color="primary"
            variant="ghost"
            icon="i-lucide-download"
            @click="downloadItem(item)"
            class="rounded-full"
          />
          <UButton color="neutral" variant="ghost" icon="i-lucide-trash2" @click="removeItem(i)" class="rounded-full" />
        </div>
      </div>
    </ToolSection>
  </ToolPage>
</template>
