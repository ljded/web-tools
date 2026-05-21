<script setup lang="ts">
import { ref, watch } from 'vue'
import CryptoJS from 'crypto-js'
import { sm3 } from 'sm-crypto'
import { Copy, Check, FileUp, X } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'
import { usePersistedRef } from '@/utils/persist'
import { useHistory } from '@/utils/history'
import HistoryPanel from '@/components/HistoryPanel.vue'

const input = usePersistedRef('web-tools:hash:input', '')
const copiedKey = ref('')

const hashHistory = useHistory<{ input: string }>('web-tools:hash:history', {
  maxCount: 15,
  generateLabel: (d) => d.input.slice(0, 50) + (d.input.length > 50 ? '...' : ''),
})

function saveHistory() {
  if (!input.value.trim()) return
  hashHistory.add({ input: input.value })
}

function onHistorySelect(item: { data: { input: string } }) {
  input.value = item.data.input
}
const file = ref<File | null>(null)
const fileHashes = ref<Record<string, string>>({})
const isComputing = ref(false)
const hashProgress = ref(0)
const textResults = ref<{ name: string; value: string }[]>([])
const textHashNotice = ref('')
let textHashTimer: ReturnType<typeof setTimeout> | null = null

const MAX_TEXT_HASH_CHARS = 400_000
const MAX_FILE_HASH_BYTES = 2 * 1024 * 1024 * 1024 // 2GB

function computeTextHashes() {
  const text = input.value
  if (!text) {
    textResults.value = []
    textHashNotice.value = ''
    return
  }
  if (text.length > MAX_TEXT_HASH_CHARS) {
    textResults.value = []
    textHashNotice.value = `文本过长，已暂停实时哈希计算。请控制在 ${MAX_TEXT_HASH_CHARS.toLocaleString()} 字符以内。`
    return
  }
  try {
    textHashNotice.value = ''
    textResults.value = [
      { name: 'MD5', value: CryptoJS.MD5(text).toString() },
      { name: 'SHA1', value: CryptoJS.SHA1(text).toString() },
      { name: 'SHA256', value: CryptoJS.SHA256(text).toString() },
      { name: 'SHA512', value: CryptoJS.SHA512(text).toString() },
      { name: 'SM3', value: sm3(text) },
    ]
  } catch {
    textResults.value = []
  }
}

watch(
  input,
  () => {
    if (textHashTimer) clearTimeout(textHashTimer)
    textHashTimer = setTimeout(computeTextHashes, 220)
  },
  { immediate: true },
)

async function copyResult(val: string, key: string) {
  const ok = await copyToClipboard(val)
  if (!ok) return
  copiedKey.value = key
  setTimeout(() => (copiedKey.value = ''), 1500)
}

function clearAll() {
  input.value = ''
  file.value = null
  fileHashes.value = {}
}

function handleFileSelect(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) setFile(f)
}

function setFile(f: File) {
  file.value = f
  input.value = ''
  computeFileHash()
}

function removeFile() {
  file.value = null
  fileHashes.value = {}
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

async function computeFileHash() {
  if (!file.value) return
  if (file.value.size > MAX_FILE_HASH_BYTES) {
    fileHashes.value = {
      错误: `文件超过 ${formatSize(MAX_FILE_HASH_BYTES)}，已跳过浏览器内哈希计算`,
    }
    return
  }
  isComputing.value = true
  hashProgress.value = 0
  fileHashes.value = {}

  try {
    const md5 = CryptoJS.algo.MD5.create()
    const sha1 = CryptoJS.algo.SHA1.create()
    const sha256 = CryptoJS.algo.SHA256.create()
    const sha512 = CryptoJS.algo.SHA512.create()

    const stream = file.value.stream()
    const reader = stream.getReader()
    let readBytes = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const wordArray = CryptoJS.lib.WordArray.create(value)
      md5.update(wordArray)
      sha1.update(wordArray)
      sha256.update(wordArray)
      sha512.update(wordArray)
      readBytes += value.byteLength
      hashProgress.value = Math.round((readBytes / file.value.size) * 100)
    }

    fileHashes.value = {
      MD5: md5.finalize().toString(),
      SHA1: sha1.finalize().toString(),
      SHA256: sha256.finalize().toString(),
      SHA512: sha512.finalize().toString(),
      SM3: 'SM3 不支持文件哈希',
    }
  } catch {
    fileHashes.value = { 错误: '计算出错' }
  } finally {
    isComputing.value = false
    hashProgress.value = 0
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  const f = e.dataTransfer?.files?.[0]
  if (f) setFile(f)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function triggerFileUpload() {
  const el = document.getElementById('hash-file') as HTMLInputElement | null
  if (el) el.value = ''
  el?.click()
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="mb-4 flex items-center justify-between">
        <span class="text-sm font-medium text-on-surface-variant">输入内容</span>
        <div class="flex items-center gap-2">
          <HistoryPanel
            :items="hashHistory.items.value"
            @select="onHistorySelect"
            @remove="hashHistory.remove"
            @clear="hashHistory.clear"
          />
          <button
            @click="clearAll"
            class="rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-variant transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      <!-- 文件上传 / 拖拽 -->
      <div
        v-if="!file"
        class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline p-6 transition-colors hover:border-primary hover:bg-primary-container/20"
        @dragover="onDragOver"
        @drop="onDrop"
        @click="triggerFileUpload"
      >
        <FileUp class="mb-2 h-6 w-6 text-primary" />
        <span class="text-sm font-medium text-on-surface">拖拽文件到此处，或点击上传</span>
        <span class="mt-1 text-xs text-on-surface-variant"
          >支持大文件流式计算 MD5 / SHA1 / SHA256 / SHA512，单文件最大 2GB</span
        >
        <input id="hash-file" type="file" class="hidden" @change="handleFileSelect" />
      </div>

      <!-- 已选文件 -->
      <div
        v-else
        class="flex items-center justify-between rounded-xl bg-primary-container/30 px-4 py-3"
      >
        <div class="min-w-0">
          <div class="truncate text-sm font-medium text-on-surface">{{ file.name }}</div>
          <div class="text-xs text-on-surface-variant">{{ formatSize(file.size) }}</div>
        </div>
        <button
          @click="removeFile"
          class="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
        >
          <X class="h-4 w-4 text-on-surface-variant" />
        </button>
      </div>

      <!-- 文本输入 -->
      <textarea
        v-if="!file"
        v-model="input"
        @blur="saveHistory"
        placeholder="输入要计算哈希的内容..."
        class="mt-4 h-40 w-full resize-none rounded-xl border border-outline bg-surface p-4 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div v-if="textHashNotice" class="mt-2 text-xs text-on-surface-variant">
        {{ textHashNotice }}
      </div>
    </div>

    <!-- 结果 -->
    <div class="space-y-3">
      <div
        v-for="item in file
          ? Object.entries(fileHashes).map(([name, value]) => ({ name, value }))
          : textResults"
        :key="item.name"
        class="rounded-2xl bg-surface p-4 shadow-sm outline outline-1 outline-outline-variant"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-medium text-on-surface-variant">{{ item.name }}</span>
          <button
            v-if="item.value && !item.value.startsWith('SM3') && !item.value.startsWith('错误')"
            @click="copyResult(item.value, item.name)"
            class="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
          >
            <Check v-if="copiedKey === item.name" class="h-3.5 w-3.5" />
            <Copy v-else class="h-3.5 w-3.5" />
            {{ copiedKey === item.name ? '已复制' : '复制' }}
          </button>
        </div>
        <div
          class="break-all rounded-xl bg-surface-variant/50 p-3 font-mono text-sm text-on-surface"
        >
          <span v-if="isComputing && file" class="text-on-surface-variant">
            计算中 {{ hashProgress }}%
          </span>
          <span v-else>{{ item.value || '等待输入...' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
