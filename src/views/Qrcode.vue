<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import QRCode from 'qrcode'
import { Download, RefreshCw } from '@lucide/vue'

const text = ref('https://example.com')
const size = ref(256)
const fgColor = ref('#000000')
const bgColor = ref('#ffffff')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const error = ref('')

async function generate() {
  if (!canvasRef.value) return
  error.value = ''
  try {
    await QRCode.toCanvas(canvasRef.value, text.value || ' ', {
      width: size.value,
      margin: 2,
      color: {
        dark: fgColor.value,
        light: bgColor.value,
      },
    })
  } catch (e: any) {
    error.value = e.message || '生成失败'
  }
}

watch([text, size, fgColor, bgColor], () => {
  nextTick(generate)
}, { immediate: true })

function download() {
  if (!canvasRef.value) return
  const link = document.createElement('a')
  link.download = 'qrcode.png'
  link.href = canvasRef.value.toDataURL('image/png')
  link.click()
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="mb-4">
        <label class="mb-1 block text-sm font-medium text-on-surface">内容</label>
        <textarea
          v-model="text"
          placeholder="输入网址或文本..."
          class="h-24 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label class="mb-1 block text-sm text-on-surface-variant">尺寸</label>
          <input
            v-model.number="size"
            type="number"
            min="64"
            max="1024"
            step="32"
            class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-on-surface-variant">前景色</label>
          <div class="flex items-center gap-2">
            <input v-model="fgColor" type="color" class="h-10 w-10 cursor-pointer rounded-lg border border-outline bg-transparent p-1" />
            <input
              v-model="fgColor"
              type="text"
              class="h-10 flex-1 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-sm text-on-surface-variant">背景色</label>
          <div class="flex items-center gap-2">
            <input v-model="bgColor" type="color" class="h-10 w-10 cursor-pointer rounded-lg border border-outline bg-transparent p-1" />
            <input
              v-model="bgColor"
              type="text"
              class="h-10 flex-1 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      <div v-if="error" class="mt-3 text-xs text-error">{{ error }}</div>
    </div>

    <div class="flex flex-col items-center rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <canvas ref="canvasRef" class="rounded-xl" />
      <div class="mt-4 flex gap-3">
        <button
          @click="generate"
          class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors"
        >
          <RefreshCw class="h-4 w-4" />
          刷新
        </button>
        <button
          @click="download"
          class="flex items-center gap-2 rounded-full bg-secondary-container px-5 py-2.5 text-sm font-medium text-on-secondary-container hover:bg-secondary-container/80 transition-colors"
        >
          <Download class="h-4 w-4" />
          下载 PNG
        </button>
      </div>
    </div>
  </div>
</template>
