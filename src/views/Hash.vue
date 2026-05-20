<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import CryptoJS from 'crypto-js'
import { sm3 } from 'sm-crypto'
import { Copy, Check, FileUp, X } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'

const input = ref('')
const algorithm = ref<'MD5' | 'SHA1' | 'SHA256' | 'SHA512' | 'SM3' | 'HMAC-MD5' | 'HMAC-SHA256'>('MD5')
const hmacKey = ref('')
const copied = ref(false)
const file = ref<File | null>(null)
const fileHash = ref('')
const isComputing = ref(false)

const result = computed(() => {
  const text = input.value
  if (!text) return ''
  try {
    switch (algorithm.value) {
      case 'MD5':
        return CryptoJS.MD5(text).toString()
      case 'SHA1':
        return CryptoJS.SHA1(text).toString()
      case 'SHA256':
        return CryptoJS.SHA256(text).toString()
      case 'SHA512':
        return CryptoJS.SHA512(text).toString()
      case 'SM3':
        return sm3(text)
      case 'HMAC-MD5':
        return CryptoJS.HmacMD5(text, hmacKey.value).toString()
      case 'HMAC-SHA256':
        return CryptoJS.HmacSHA256(text, hmacKey.value).toString()
      default:
        return ''
    }
  } catch {
    return '计算出错'
  }
})

async function copyResult() {
  const val = file.value ? fileHash.value : result.value
  if (!val) return
  const ok = await copyToClipboard(val)
  if (!ok) return
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function clearAll() {
  input.value = ''
  hmacKey.value = ''
  file.value = null
  fileHash.value = ''
}

watch(algorithm, (val) => {
  if (!val.startsWith('HMAC')) {
    hmacKey.value = ''
  }
  if (file.value) {
    computeFileHash()
  }
})

watch(hmacKey, () => {
  if (file.value && algorithm.value.startsWith('HMAC')) {
    computeFileHash()
  }
})

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
  fileHash.value = ''
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

async function computeFileHash() {
  if (!file.value) return
  isComputing.value = true
  fileHash.value = ''

  try {
    const buffer = await file.value.arrayBuffer()
    const wordArray = CryptoJS.lib.WordArray.create(buffer)

    switch (algorithm.value) {
      case 'MD5':
        fileHash.value = CryptoJS.MD5(wordArray).toString()
        break
      case 'SHA1':
        fileHash.value = CryptoJS.SHA1(wordArray).toString()
        break
      case 'SHA256':
        fileHash.value = CryptoJS.SHA256(wordArray).toString()
        break
      case 'SHA512':
        fileHash.value = CryptoJS.SHA512(wordArray).toString()
        break
      case 'SM3':
        fileHash.value = 'SM3 不支持文件哈希，请使用文本模式'
        break
      case 'HMAC-MD5':
        fileHash.value = CryptoJS.HmacMD5(wordArray, hmacKey.value).toString()
        break
      case 'HMAC-SHA256':
        fileHash.value = CryptoJS.HmacSHA256(wordArray, hmacKey.value).toString()
        break
      default:
        fileHash.value = ''
    }
  } catch {
    fileHash.value = '计算出错'
  } finally {
    isComputing.value = false
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
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <select
          v-model="algorithm"
          class="h-10 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="MD5">MD5</option>
          <option value="SHA1">SHA1</option>
          <option value="SHA256">SHA256</option>
          <option value="SHA512">SHA512</option>
          <option value="SM3">SM3</option>
          <option value="HMAC-MD5">HMAC-MD5</option>
          <option value="HMAC-SHA256">HMAC-SHA256</option>
        </select>
        <input
          v-if="algorithm.startsWith('HMAC')"
          v-model="hmacKey"
          placeholder="HMAC 密钥"
          class="h-10 flex-1 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          @click="clearAll"
          class="ml-auto rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-variant transition-colors"
        >
          清空
        </button>
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
        <span class="mt-1 text-xs text-on-surface-variant">支持计算文件 MD5 / SHA1 / SHA256 / SHA512 / HMAC</span>
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
        placeholder="输入要计算哈希的内容..."
        class="mt-4 h-40 w-full resize-none rounded-xl border border-outline bg-surface p-4 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>

    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-sm font-medium text-on-surface-variant">计算结果</span>
        <button
          v-if="(file ? fileHash : result)"
          @click="copyResult"
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
        >
          <Check v-if="copied" class="h-3.5 w-3.5" />
          <Copy v-else class="h-3.5 w-3.5" />
          {{ copied ? '已复制' : '复制' }}
        </button>
      </div>
      <div
        class="break-all rounded-xl bg-surface-variant/50 p-4 font-mono text-sm text-on-surface"
      >
        <span v-if="isComputing" class="text-on-surface-variant">计算中...</span>
        <span v-else>{{ file ? (fileHash || '等待计算...') : (result || '等待输入...') }}</span>
      </div>
    </div>
  </div>
</template>
