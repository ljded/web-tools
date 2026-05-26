<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { usePersistedRef } from '@/utils/persist'
import { compressImageFile } from '@/utils/imageCompression'
import FileDropZone from '@/components/FileDropZone.vue'
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

interface ImageSource {
  file: File
  url: string
  width: number
  height: number
}

type BatchOp = 'compress' | 'format' | 'resize' | 'watermark' | 'rotate' | 'crop'
type LabOp = 'phantom' | 'stitch' | 'metadata' | 'gif' | 'editor'

const files = ref<FileItem[]>([])
const labImages = ref<ImageSource[]>([])
const activeMode = usePersistedRef<'batch' | 'lab'>('web-tools:image:active-mode', 'batch')
const batchOp = usePersistedRef<BatchOp>('web-tools:image:batch-op', 'compress')
const labOp = usePersistedRef<LabOp>('web-tools:image:lab-op', 'phantom')

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

const stitchDirection = usePersistedRef<'vertical' | 'horizontal' | 'grid'>('web-tools:image:stitch-direction', 'vertical')
const stitchGap = usePersistedRef('web-tools:image:stitch-gap', 12)
const stitchBg = usePersistedRef('web-tools:image:stitch-bg', '#ffffff')
const gifDelay = usePersistedRef('web-tools:image:gif-delay', 500)
const editorBrightness = usePersistedRef('web-tools:image:editor-brightness', 100)
const editorContrast = usePersistedRef('web-tools:image:editor-contrast', 100)
const editorSaturation = usePersistedRef('web-tools:image:editor-saturation', 100)
const editorBlur = usePersistedRef('web-tools:image:editor-blur', 0)
const editorFlipX = usePersistedRef('web-tools:image:editor-flip-x', false)
const editorFlipY = usePersistedRef('web-tools:image:editor-flip-y', false)

const labResultUrl = ref('')
const labResultName = ref('image-output.png')
const labError = ref('')
const gifInfo = ref('')
const phantomWhiteIndex = ref(0)
const phantomBlackIndex = ref(1)

const batchOps = [
  { value: 'compress' as const, label: '压缩', icon: 'i-lucide-minimize-2' },
  { value: 'format' as const, label: '转格式', icon: 'i-lucide-image' },
  { value: 'resize' as const, label: '缩放', icon: 'i-lucide-maximize' },
  { value: 'watermark' as const, label: '水印', icon: 'i-lucide-type' },
  { value: 'rotate' as const, label: '旋转', icon: 'i-lucide-rotate-cw' },
  { value: 'crop' as const, label: '裁剪', icon: 'i-lucide-scissors' },
]

const labOps = [
  { value: 'phantom' as const, label: '幻影坦克', icon: 'i-lucide-layers' },
  { value: 'stitch' as const, label: '图片拼接', icon: 'i-lucide-gallery-horizontal' },
  { value: 'metadata' as const, label: '图片信息', icon: 'i-lucide-info' },
  { value: 'gif' as const, label: 'GIF', icon: 'i-lucide-film' },
  { value: 'editor' as const, label: '可视编辑', icon: 'i-lucide-sliders-horizontal' },
]

const metadataText = computed(() => {
  if (!labImages.value.length) return '请先上传图片'
  return labImages.value.map((item, index) => [
    `#${index + 1} ${item.file.name}`,
    `type: ${item.file.type || 'unknown'}`,
    `size: ${formatBytes(item.file.size)}`,
    `dimension: ${item.width} × ${item.height}`,
    `lastModified: ${new Date(item.file.lastModified).toLocaleString()}`,
  ].join('\n')).join('\n\n')
})

const phantomImageOptions = computed(() => labImages.value.map((item, index) => ({
  label: `#${index + 1} ${item.file.name}`,
  value: index,
})))

function syncPhantomIndexes() {
  if (!labImages.value.length) {
    phantomWhiteIndex.value = 0
    phantomBlackIndex.value = 1
    return
  }

  const lastIndex = labImages.value.length - 1
  phantomWhiteIndex.value = Math.min(Math.max(phantomWhiteIndex.value, 0), lastIndex)
  phantomBlackIndex.value = Math.min(Math.max(phantomBlackIndex.value, 0), lastIndex)
  if (labImages.value.length > 1 && phantomWhiteIndex.value === phantomBlackIndex.value) {
    phantomBlackIndex.value = phantomWhiteIndex.value === 0 ? 1 : 0
  }
}

function swapPhantomRoles() {
  const white = phantomWhiteIndex.value
  phantomWhiteIndex.value = phantomBlackIndex.value
  phantomBlackIndex.value = white
  clearLabResult()
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function revokeItemUrls(item: FileItem) {
  URL.revokeObjectURL(item.preview)
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
}

function clearLabResult() {
  if (labResultUrl.value) URL.revokeObjectURL(labResultUrl.value)
  labResultUrl.value = ''
  labError.value = ''
}

function addFiles(fileList: File[]) {
  const valid = fileList.filter((f) => f.type.startsWith('image/'))
  files.value.push(...valid.map((file) => ({ file, preview: URL.createObjectURL(file) })))
}

async function addLabFiles(fileList: File[]) {
  const valid = fileList.filter((f) => f.type.startsWith('image/'))
  const loaded = await Promise.all(valid.map(loadImageSource))
  labImages.value.push(...loaded)
  syncPhantomIndexes()
  clearLabResult()
  if (labOp.value === 'gif') inspectGif()
}

function removeItem(idx: number) {
  const item = files.value[idx]
  if (item) revokeItemUrls(item)
  files.value.splice(idx, 1)
}

function removeLabImage(idx: number) {
  const item = labImages.value[idx]
  if (item) URL.revokeObjectURL(item.url)
  labImages.value.splice(idx, 1)
  syncPhantomIndexes()
  clearLabResult()
}

onUnmounted(() => {
  files.value.forEach(revokeItemUrls)
  labImages.value.forEach((item) => URL.revokeObjectURL(item.url))
  clearLabResult()
})

function loadImageSource(file: File): Promise<ImageSource> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ file, url, width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')) }
    img.src = url
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = url
  })
}

function canvasToResult(canvas: HTMLCanvasElement, name: string, type = 'image/png', qualityValue = 0.92): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('导出失败')); return }
      clearLabResult()
      labResultUrl.value = URL.createObjectURL(blob)
      labResultName.value = name
      resolve()
    }, type, qualityValue)
  })
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
        item.ratio = ((1 - file.size / item.file.size) * 100).toFixed(1) + '%'
      } catch {
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
      img.onload = () => processCanvasItem(item, img)
      img.onerror = () => { item.error = '加载失败'; item.processing = false }
      img.src = item.preview
    })
  }
}

function processCanvasItem(item: FileItem, img: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  let w = img.width
  let h = img.height

  if (batchOp.value === 'resize') {
    const targetWidth = Math.max(1, Math.round(Number(resizeWidth.value) || w))
    const targetHeight = Math.max(1, Math.round(Number(resizeHeight.value) || h))
    if (keepRatio.value) {
      const ratio = Math.max(1 / Math.max(w, h), Math.min(targetWidth / w, targetHeight / h))
      w = Math.max(1, Math.round(w * ratio))
      h = Math.max(1, Math.round(h * ratio))
    } else {
      w = targetWidth
      h = targetHeight
    }
    canvas.width = w
    canvas.height = h
    ctx.drawImage(img, 0, 0, w, h)
  } else if (batchOp.value === 'rotate') {
    const deg = rotateDeg.value
    if (deg === 90 || deg === 270) { canvas.width = h; canvas.height = w } else { canvas.width = w; canvas.height = h }
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
    const padding = 16
    let x = 0
    let y = 0
    switch (wmPos.value) {
      case 'top-left': x = padding; y = padding + th; break
      case 'top-right': x = w - tw - padding; y = padding + th; break
      case 'bottom-left': x = padding; y = h - padding; break
      case 'bottom-right': x = w - tw - padding; y = h - padding; break
      case 'center': x = (w - tw) / 2; y = (h + th) / 2; break
    }
    ctx.fillText(wmText.value, x, y)
    ctx.restore()
  }

  canvas.toBlob((blob) => {
    if (!blob) { item.error = '导出失败'; item.processing = false; return }
    const extMap: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }
    if (batchOp.value === 'format') item.resultName = item.file.name.replace(/\.[^.]+$/, '') + (extMap[targetFormat.value] || '.jpg')
    else item.resultName = item.file.name.replace(/\.[^.]+$/, '') + `_${batchOp.value}.jpg`
    item.resultFile = new File([blob], item.resultName || 'output.jpg', { type: batchOp.value === 'format' ? targetFormat.value : 'image/jpeg' })
    item.resultUrl = URL.createObjectURL(blob)
    item.processing = false
  }, batchOp.value === 'format' ? targetFormat.value : 'image/jpeg', 0.9)
}

function downloadItem(item: FileItem) {
  if (!item.resultFile || !item.resultUrl) return
  downloadUrl(item.resultUrl, item.resultName || 'output.jpg')
}

function downloadLabResult() {
  if (labResultUrl.value) downloadUrl(labResultUrl.value, labResultName.value)
}

function downloadUrl(url: string, name: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
}

async function generatePhantomTank() {
  syncPhantomIndexes()
  const whiteSource = labImages.value[phantomWhiteIndex.value]
  const blackSource = labImages.value[phantomBlackIndex.value]
  if (!whiteSource || !blackSource || phantomWhiteIndex.value === phantomBlackIndex.value) {
    labError.value = '需要选择两张不同图片：白底可见图与黑底可见图'
    return
  }

  try {
    const whiteImg = await loadImage(whiteSource.url)
    const blackImg = await loadImage(blackSource.url)
    const width = Math.min(whiteImg.width, blackImg.width, 1600)
    const height = Math.min(whiteImg.height, blackImg.height, 1600)
    const canvas = document.createElement('canvas')
    const a = document.createElement('canvas')
    const b = document.createElement('canvas')
    canvas.width = a.width = b.width = width
    canvas.height = a.height = b.height = height
    const ctx = canvas.getContext('2d')!
    const actx = a.getContext('2d', { willReadFrequently: true })!
    const bctx = b.getContext('2d', { willReadFrequently: true })!
    actx.drawImage(whiteImg, 0, 0, width, height)
    bctx.drawImage(blackImg, 0, 0, width, height)
    const whiteData = actx.getImageData(0, 0, width, height)
    const blackData = bctx.getImageData(0, 0, width, height)
    const out = ctx.createImageData(width, height)
    for (let i = 0; i < out.data.length; i += 4) {
      const whiteLum = (whiteData.data[i]! * 0.299 + whiteData.data[i + 1]! * 0.587 + whiteData.data[i + 2]! * 0.114) / 255
      const blackLum = (blackData.data[i]! * 0.299 + blackData.data[i + 1]! * 0.587 + blackData.data[i + 2]! * 0.114) / 255
      const alpha = Math.min(1, Math.max(0, 1 - whiteLum + blackLum))
      const gray = alpha <= 0.001 ? 0 : Math.round(Math.min(1, Math.max(0, blackLum / alpha)) * 255)
      out.data[i] = out.data[i + 1] = out.data[i + 2] = gray
      out.data[i + 3] = Math.round(alpha * 255)
    }
    ctx.putImageData(out, 0, 0)
    await canvasToResult(canvas, 'phantom-tank.png')
  } catch (error) {
    labError.value = error instanceof Error ? error.message : String(error)
  }
}

async function stitchImages() {
  if (!labImages.value.length) { labError.value = '请先上传图片'; return }
  try {
    const images = await Promise.all(labImages.value.map((item) => loadImage(item.url)))
    const gap = Math.max(0, stitchGap.value)
    const canvas = document.createElement('canvas')
    if (stitchDirection.value === 'horizontal') {
      canvas.width = images.reduce((sum, img) => sum + img.width, 0) + gap * (images.length - 1)
      canvas.height = Math.max(...images.map((img) => img.height))
    } else if (stitchDirection.value === 'grid') {
      const cols = Math.ceil(Math.sqrt(images.length))
      const cellW = Math.max(...images.map((img) => img.width))
      const cellH = Math.max(...images.map((img) => img.height))
      canvas.width = cols * cellW + gap * (cols - 1)
      canvas.height = Math.ceil(images.length / cols) * cellH + gap * (Math.ceil(images.length / cols) - 1)
    } else {
      canvas.width = Math.max(...images.map((img) => img.width))
      canvas.height = images.reduce((sum, img) => sum + img.height, 0) + gap * (images.length - 1)
    }
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = stitchBg.value
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    let x = 0
    let y = 0
    if (stitchDirection.value === 'grid') {
      const cols = Math.ceil(Math.sqrt(images.length))
      const cellW = Math.max(...images.map((img) => img.width))
      const cellH = Math.max(...images.map((img) => img.height))
      images.forEach((img, index) => ctx.drawImage(img, (index % cols) * (cellW + gap), Math.floor(index / cols) * (cellH + gap)))
    } else {
      images.forEach((img) => {
        ctx.drawImage(img, x, y)
        if (stitchDirection.value === 'horizontal') x += img.width + gap
        else y += img.height + gap
      })
    }
    await canvasToResult(canvas, 'stitched.png')
  } catch (error) {
    labError.value = error instanceof Error ? error.message : String(error)
  }
}

async function stripMetadata() {
  const source = labImages.value[0]
  if (!source) { labError.value = '请先上传图片'; return }
  try {
    const img = await loadImage(source.url)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    await canvasToResult(canvas, source.file.name.replace(/\.[^.]+$/, '') + '_clean.png')
  } catch (error) {
    labError.value = error instanceof Error ? error.message : String(error)
  }
}

async function applyVisualEditor() {
  const source = labImages.value[0]
  if (!source) { labError.value = '请先上传图片'; return }
  try {
    const img = await loadImage(source.url)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.filter = `brightness(${editorBrightness.value}%) contrast(${editorContrast.value}%) saturate(${editorSaturation.value}%) blur(${editorBlur.value}px)`
    ctx.translate(editorFlipX.value ? canvas.width : 0, editorFlipY.value ? canvas.height : 0)
    ctx.scale(editorFlipX.value ? -1 : 1, editorFlipY.value ? -1 : 1)
    ctx.drawImage(img, 0, 0)
    await canvasToResult(canvas, source.file.name.replace(/\.[^.]+$/, '') + '_edited.png')
  } catch (error) {
    labError.value = error instanceof Error ? error.message : String(error)
  }
}

async function exportFirstGifFrame() {
  const source = labImages.value[0]
  if (!source) { labError.value = '请先上传 GIF'; return }
  try {
    const img = await loadImage(source.url)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    await canvasToResult(canvas, source.file.name.replace(/\.[^.]+$/, '') + '_frame.png')
  } catch (error) {
    labError.value = error instanceof Error ? error.message : String(error)
  }
}

async function inspectGif() {
  const source = labImages.value[0]
  if (!source) { gifInfo.value = ''; return }
  const buffer = await source.file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const header = String.fromCharCode(...bytes.slice(0, 6))
  if (!header.startsWith('GIF')) {
    gifInfo.value = '当前首图不是 GIF，可上传多张静态图片生成简单 GIF。'
    return
  }
  let imageCount = 0
  let gceCount = 0
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x2c) imageCount++
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9) gceCount++
  }
  gifInfo.value = [`format: ${header}`, `frames: ${Math.max(imageCount, gceCount)}`, `size: ${formatBytes(source.file.size)}`, `dimension: ${source.width} × ${source.height}`].join('\n')
}

async function createGif() {
  if (!labImages.value.length) { labError.value = '请先上传图片序列'; return }
  try {
    const images = await Promise.all(labImages.value.map((item) => loadImage(item.url)))
    const width = Math.min(Math.max(...images.map((img) => img.width)), 480)
    const height = Math.min(Math.max(...images.map((img) => img.height)), 480)
    const frames = images.map((img) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      const scale = Math.min(width / img.width, height / img.height)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h)
      return ctx.getImageData(0, 0, width, height).data
    })
    const blob = new Blob([encodeGif(frames, width, height, Math.max(20, gifDelay.value))], { type: 'image/gif' })
    clearLabResult()
    labResultUrl.value = URL.createObjectURL(blob)
    labResultName.value = 'animated.gif'
  } catch (error) {
    labError.value = error instanceof Error ? error.message : String(error)
  }
}

function encodeGif(frames: Uint8ClampedArray[], width: number, height: number, delayMs: number) {
  const bytes: number[] = []
  const push = (...values: number[]) => bytes.push(...values)
  const text = (value: string) => push(...value.split('').map((char) => char.charCodeAt(0)))
  const word = (value: number) => push(value & 255, (value >> 8) & 255)
  text('GIF89a')
  word(width); word(height); push(0xf7, 0, 0)
  for (let i = 0; i < 256; i++) push((i >> 5) * 36, ((i >> 2) & 7) * 36, (i & 3) * 85)
  text('NETSCAPE2.0'); bytes.splice(13 + 768, 0, 0x21, 0xff, 0x0b)
  push(3, 1); word(0); push(0)
  frames.forEach((frame) => {
    push(0x21, 0xf9, 4, 0x04); word(Math.round(delayMs / 10)); push(0, 0)
    push(0x2c); word(0); word(0); word(width); word(height); push(0)
    const indices = new Uint8Array(width * height)
    for (let i = 0, p = 0; i < frame.length; i += 4, p++) {
      const r = frame[i]! >> 5
      const g = frame[i + 1]! >> 5
      const b = frame[i + 2]! >> 6
      indices[p] = (r << 5) | (g << 2) | b
    }
    push(8, ...lzwEncode(indices, 8), 0)
  })
  push(0x3b)
  return new Uint8Array(bytes)
}

function lzwEncode(indices: Uint8Array, minCodeSize: number) {
  const clearCode = 1 << minCodeSize
  const endCode = clearCode + 1
  let codeSize = minCodeSize + 1
  let nextCode = endCode + 1
  const dict = new Map<string, number>()
  const data: number[] = []
  let bitBuffer = 0
  let bitCount = 0
  const writeCode = (code: number) => {
    bitBuffer |= code << bitCount
    bitCount += codeSize
    while (bitCount >= 8) {
      data.push(bitBuffer & 255)
      bitBuffer >>= 8
      bitCount -= 8
    }
  }
  const reset = () => {
    dict.clear()
    for (let i = 0; i < clearCode; i++) dict.set(String(i), i)
    codeSize = minCodeSize + 1
    nextCode = endCode + 1
  }
  reset()
  writeCode(clearCode)
  let phrase = String(indices[0] ?? 0)
  for (let i = 1; i < indices.length; i++) {
    const current = String(indices[i])
    const joined = `${phrase},${current}`
    if (dict.has(joined)) {
      phrase = joined
    } else {
      writeCode(dict.get(phrase)!)
      if (nextCode < 4096) {
        dict.set(joined, nextCode++)
        if (nextCode === (1 << codeSize) && codeSize < 12) codeSize++
      } else {
        writeCode(clearCode)
        reset()
      }
      phrase = current
    }
  }
  writeCode(dict.get(phrase)!)
  writeCode(endCode)
  if (bitCount > 0) data.push(bitBuffer & 255)
  const blocks: number[] = []
  for (let i = 0; i < data.length; i += 255) {
    const block = data.slice(i, i + 255)
    blocks.push(block.length, ...block)
  }
  return blocks
}

watch(labOp, () => {
  clearLabResult()
  if (labOp.value === 'gif') inspectGif()
})
</script>

<template>
  <ToolPage name="image" max-width="6xl">
    <template #actions>
      <UTabs v-model="activeMode" :items="[{ label: '批处理', value: 'batch', icon: 'i-lucide-images' }, { label: '实验室', value: 'lab', icon: 'i-lucide-wand-sparkles' }]" />
    </template>

    <div v-if="activeMode === 'batch'" class="space-y-5">
      <ToolSection title="处理参数" compact>
        <UTabs v-model="batchOp" :items="batchOps.map((op) => ({ label: op.label, value: op.value, icon: op.icon }))" />
        <div class="hig-subtle-surface mt-4 grid gap-4 rounded-[1.75rem] border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <template v-if="batchOp === 'compress'">
            <UFormField :label="`质量 ${Math.round(quality * 100)}%`">
              <USlider v-model="quality" :min="0.1" :max="1" :step="0.1" />
            </UFormField>
            <UFormField label="最大宽高">
              <UInput v-model.number="maxWidth" class="w-full" />
            </UFormField>
          </template>
          <template v-if="batchOp === 'format'">
            <UFormField label="目标格式">
              <USelect v-model="targetFormat" :items="[{ label: 'JPEG', value: 'image/jpeg' }, { label: 'PNG', value: 'image/png' }, { label: 'WebP', value: 'image/webp' }]" class="w-full" />
            </UFormField>
          </template>
          <template v-if="batchOp === 'resize'">
            <UFormField label="宽度">
              <UInput v-model.number="resizeWidth" class="w-full" />
            </UFormField>
            <UFormField label="高度">
              <UInput v-model.number="resizeHeight" class="w-full" />
            </UFormField>
            <div class="flex items-end pb-1">
              <UCheckbox v-model="keepRatio" label="保持比例" />
            </div>
          </template>
          <template v-if="batchOp === 'watermark'">
            <UFormField label="文字">
              <UInput v-model="wmText" class="w-full" />
            </UFormField>
            <UFormField :label="`大小 ${wmSize}`">
              <USlider v-model="wmSize" :min="12" :max="72" :step="1" />
            </UFormField>
            <UFormField label="颜色">
              <UColorPicker v-model="wmColor" />
            </UFormField>
            <UFormField label="位置">
              <USelect v-model="wmPos" :items="[{ label: '居中', value: 'center' }, { label: '左上', value: 'top-left' }, { label: '右上', value: 'top-right' }, { label: '左下', value: 'bottom-left' }, { label: '右下', value: 'bottom-right' }]" class="w-full" />
            </UFormField>
          </template>
          <template v-if="batchOp === 'rotate'">
            <UFormField label="旋转角度">
              <USelect v-model="rotateDeg" :items="[{ label: '90°', value: 90 }, { label: '180°', value: 180 }, { label: '270°', value: 270 }]" class="w-full" />
            </UFormField>
          </template>
          <template v-if="batchOp === 'crop'">
            <UFormField label="上">
              <UInput v-model.number="cropTop" class="w-full" />
            </UFormField>
            <UFormField label="右">
              <UInput v-model.number="cropRight" class="w-full" />
            </UFormField>
            <UFormField label="下">
              <UInput v-model.number="cropBottom" class="w-full" />
            </UFormField>
            <UFormField label="左">
              <UInput v-model.number="cropLeft" class="w-full" />
            </UFormField>
          </template>
        </div>
      </ToolSection>

      <ToolSection title="上传与处理" compact>
        <template #actions><UButton color="primary" icon="i-lucide-play" class="rounded-full" :disabled="!files.length" @click="processAll">全部处理</UButton></template>
        <FileDropZone accept="image/*" multiple title="拖拽图片或点击上传" icon="i-lucide-image-up" ui-base="h-36 hig-subtle-surface rounded-[1.75rem] border-2 border-dashed transition-colors hover:border-primary/40 hover:bg-primary/5" @files="addFiles" />
        <div v-if="files.length" class="mt-4 space-y-3">
          <div v-for="(item, i) in files" :key="`${item.file.name}-${item.file.size}-${item.file.lastModified}`" class="flex items-center gap-3 tool-list-item">
            <img :src="item.preview" class="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-sm" />
            <div class="min-w-0 flex-1"><div class="truncate text-sm">{{ item.file.name }}</div><UBadge v-if="item.error" color="error" variant="soft" size="xs">{{ item.error }}</UBadge><UBadge v-else-if="item.loading" color="info" variant="soft" size="xs">压缩中...</UBadge><UBadge v-else-if="item.processing" color="info" variant="soft" size="xs">处理中...</UBadge><div v-else-if="item.resultFile" class="text-xs text-success">已完成 <span v-if="item.ratio" class="ml-1">(-{{ item.ratio }})</span></div></div>
            <UButton v-if="item.resultFile && item.resultUrl" color="primary" variant="ghost" icon="i-lucide-download" class="rounded-full" @click="downloadItem(item)" />
            <UButton color="neutral" variant="ghost" icon="i-lucide-trash2" class="rounded-full" @click="removeItem(i)" />
          </div>
        </div>
      </ToolSection>
    </div>

    <div v-else class="space-y-5">
      <ToolSection title="媒体实验室" description="幻影坦克、拼接、元数据清理、GIF 生成/拆帧与轻量可视编辑。" compact>
        <UTabs v-model="labOp" :items="labOps.map((op) => ({ label: op.label, value: op.value, icon: op.icon }))" />
        <FileDropZone class="mt-4" accept="image/*" multiple title="上传图片素材" icon="i-lucide-images" @files="addLabFiles" />
        <div v-if="labImages.length" class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div v-for="(item, i) in labImages" :key="item.url" class="tool-list-item group relative overflow-hidden p-2">
            <img :src="item.url" class="h-28 w-full rounded-xl object-cover" />
            <div class="mt-2 truncate text-xs text-muted">{{ item.file.name }}</div>
            <UButton icon="i-lucide-x" color="neutral" variant="solid" size="xs" class="absolute right-3 top-3 rounded-full opacity-0 group-hover:opacity-100" @click="removeLabImage(i)" />
          </div>
        </div>
      </ToolSection>

      <ToolSection :title="labOps.find((op) => op.value === labOp)?.label || '处理'" compact>
        <div v-if="labOp === 'phantom'" class="space-y-4">
          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-info"
            description="选择白底可见图和黑底可见图后生成透明 PNG。若效果相反，可点击交换两图重新生成。"
          />
          <div class="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
            <UFormField label="白底可见图">
              <USelect v-model="phantomWhiteIndex" :items="phantomImageOptions" :disabled="labImages.length < 2" class="w-full" @update:model-value="clearLabResult" />
            </UFormField>
            <UButton color="neutral" variant="soft" icon="i-lucide-arrow-left-right" class="rounded-full" :disabled="labImages.length < 2" @click="swapPhantomRoles">
              交换
            </UButton>
            <UFormField label="黑底可见图">
              <USelect v-model="phantomBlackIndex" :items="phantomImageOptions" :disabled="labImages.length < 2" class="w-full" @update:model-value="clearLabResult" />
            </UFormField>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton color="primary" icon="i-lucide-wand-sparkles" class="rounded-full" :disabled="labImages.length < 2 || phantomWhiteIndex === phantomBlackIndex" @click="generatePhantomTank">
              生成幻影坦克
            </UButton>
            <UBadge v-if="labImages.length >= 2 && phantomWhiteIndex === phantomBlackIndex" color="warning" variant="soft" class="rounded-full">
              请选择两张不同图片
            </UBadge>
          </div>
        </div>
        <div v-if="labOp === 'stitch'" class="hig-subtle-surface grid gap-4 rounded-[1.75rem] border p-4 sm:grid-cols-3">
          <UFormField label="方向">
            <USelect v-model="stitchDirection" :items="[{ label: '纵向', value: 'vertical' }, { label: '横向', value: 'horizontal' }, { label: '网格', value: 'grid' }]" class="w-full" />
          </UFormField>
          <UFormField label="间距">
            <UInput v-model.number="stitchGap" class="w-full" />
          </UFormField>
          <UFormField label="背景">
            <UColorPicker v-model="stitchBg" />
          </UFormField>
          <div class="sm:col-span-3">
            <UButton color="primary" icon="i-lucide-gallery-horizontal" class="rounded-full" :disabled="!labImages.length" @click="stitchImages">拼接图片</UButton>
          </div>
        </div>
        <div v-if="labOp === 'metadata'" class="space-y-3">
          <pre class="hig-subtle-surface max-h-80 overflow-auto rounded-[1.35rem] border p-4 text-xs text-toned">{{ metadataText }}</pre>
          <UButton color="primary" icon="i-lucide-eraser" class="rounded-full" :disabled="!labImages.length" @click="stripMetadata">重绘并清理元数据</UButton>
        </div>
        <div v-if="labOp === 'gif'" class="space-y-3">
          <div class="hig-subtle-surface grid gap-4 rounded-[1.75rem] border p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <UFormField label="帧间隔(ms)">
              <UInput v-model.number="gifDelay" class="w-full" />
            </UFormField>
            <UButton color="primary" icon="i-lucide-film" class="rounded-full" :disabled="!labImages.length" @click="createGif">图片转 GIF</UButton>
            <UButton color="neutral" variant="soft" icon="i-lucide-split" class="rounded-full" :disabled="!labImages.length" @click="exportFirstGifFrame">导出 GIF 首帧</UButton>
          </div>
          <pre v-if="gifInfo" class="hig-subtle-surface rounded-[1.35rem] border p-4 text-xs text-toned">{{ gifInfo }}</pre>
        </div>
        <div v-if="labOp === 'editor'" class="space-y-4">
          <div class="hig-subtle-surface grid grid-cols-1 gap-4 rounded-[1.75rem] border p-4 md:grid-cols-4">
            <UFormField :label="`亮度 ${editorBrightness}%`"><USlider v-model="editorBrightness" :min="0" :max="200" /></UFormField>
            <UFormField :label="`对比 ${editorContrast}%`"><USlider v-model="editorContrast" :min="0" :max="200" /></UFormField>
            <UFormField :label="`饱和 ${editorSaturation}%`"><USlider v-model="editorSaturation" :min="0" :max="200" /></UFormField>
            <UFormField :label="`模糊 ${editorBlur}px`"><USlider v-model="editorBlur" :min="0" :max="12" /></UFormField>
          </div>
          <div class="flex flex-wrap items-center gap-4">
            <UCheckbox v-model="editorFlipX" label="水平翻转" />
            <UCheckbox v-model="editorFlipY" label="垂直翻转" />
            <UButton color="primary" icon="i-lucide-sliders-horizontal" class="rounded-full" :disabled="!labImages.length" @click="applyVisualEditor">应用编辑</UButton>
          </div>
        </div>
        <UAlert v-if="labError" class="mt-4" color="error" variant="soft" icon="i-lucide-circle-alert" :description="labError" />
      </ToolSection>

      <ToolSection v-if="labResultUrl" title="输出预览" compact>
        <template #actions><UButton icon="i-lucide-download" color="primary" class="rounded-full" @click="downloadLabResult">下载结果</UButton></template>
        <div v-if="labOp === 'phantom'" class="grid gap-4 md:grid-cols-2">
          <div class="rounded-[1.75rem] border border-white/70 p-4 shadow-inner shadow-black/5" style="background-color: #fff;">
            <div class="mb-3 text-xs font-semibold uppercase tracking-wider" style="color: #64748b;">浅色背景</div>
            <img :src="labResultUrl" class="mx-auto max-h-[420px] max-w-full rounded-2xl object-contain" />
          </div>
          <div class="rounded-[1.75rem] border border-white/10 p-4 shadow-inner shadow-black/40" style="background-color: #020617;">
            <div class="mb-3 text-xs font-semibold uppercase tracking-wider" style="color: #cbd5e1;">深色背景</div>
            <img :src="labResultUrl" class="mx-auto max-h-[420px] max-w-full rounded-2xl object-contain" />
          </div>
        </div>
        <div v-else class="hig-subtle-surface rounded-[1.75rem] border p-4"><img :src="labResultUrl" class="mx-auto max-h-[520px] max-w-full rounded-2xl object-contain" /></div>
      </ToolSection>
    </div>
  </ToolPage>
</template>
