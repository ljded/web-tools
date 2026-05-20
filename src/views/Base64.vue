<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Copy, Check, ArrowRightLeft, FileUp } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'

const mode = ref<'encode' | 'decode'>('encode')
const input = ref('')
const copied = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const imgPreview = ref('')
const showPreview = ref(false)

function updatePreview() {
  if (mode.value !== 'decode' || !input.value) {
    showPreview.value = false
    return
  }
  let src = input.value.trim()
  if (!src.startsWith('data:image')) {
    src = 'data:image/png;base64,' + src
  }
  imgPreview.value = src
  showPreview.value = true
}

function onImgError() {
  showPreview.value = false
}

watch([input, mode], () => {
  updatePreview()
})

const result = computed(() => {
  if (!input.value) return ''
  try {
    if (mode.value === 'encode') {
      return btoa(unescape(encodeURIComponent(input.value)))
    } else {
      return decodeURIComponent(escape(atob(input.value)))
    }
  } catch {
    return '转换失败，请检查输入内容'
  }
})

async function copyResult() {
  if (!result.value) return
  const ok = await copyToClipboard(result.value)
  if (!ok) return
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function switchMode() {
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
  input.value = result.value
}

function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result
    if (typeof result !== 'string') return
    const base64 = result.split(',')[1] || ''
    input.value = base64
    mode.value = 'decode'
  }
  reader.readAsDataURL(file)
}

function triggerFile() {
  if (fileInput.value) fileInput.value.value = ''
  fileInput.value?.click()
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="mb-4 flex items-center gap-3">
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

      <textarea
        v-model="input"
        :placeholder="mode === 'encode' ? '输入要编码的文本...' : '输入要解码的 Base64...'"
        class="h-40 w-full resize-none rounded-xl border border-outline bg-surface p-4 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>

    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-sm font-medium text-on-surface-variant">结果</span>
        <button
          v-if="result"
          @click="copyResult"
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
        >
          <Check v-if="copied" class="h-3.5 w-3.5" />
          <Copy v-else class="h-3.5 w-3.5" />
          {{ copied ? '已复制' : '复制' }}
        </button>
      </div>
      <div class="break-all rounded-xl bg-surface-variant/50 p-4 font-mono text-sm text-on-surface">
        {{ result || '等待输入...' }}
      </div>
      <div v-if="showPreview && mode === 'decode'" class="mt-4">
        <div class="mb-2 text-xs font-medium text-on-surface-variant">图片预览</div>
        <img
          :src="imgPreview"
          class="max-h-64 rounded-xl object-contain"
          @error="onImgError"
        />
      </div>
    </div>
  </div>
</template>
