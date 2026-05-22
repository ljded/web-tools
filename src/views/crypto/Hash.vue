<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { X } from '@lucide/vue'
import { useToolState, useFileHandler, useDebouncedCompute } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import HashWorker from '@/workers/hash.worker?worker'
import { createWorkerPool } from '@/workers/pool'

const MAX_TEXT_HASH_CHARS = 400_000
const MAX_FILE_HASH_BYTES = 2 * 1024 * 1024 * 1024 // 2GB

const { input, history, saveHistory, reset } = useToolState<string, { input: string }>({
  storageKey: 'hash',
  defaultInput: '',
  historyOptions: {
    maxCount: 15,
    generateLabel: (d) => d.input.slice(0, 50) + (d.input.length > 50 ? '...' : ''),
  },
})

const fileHandler = useFileHandler({ maxSize: MAX_FILE_HASH_BYTES })
const hashWorkerPool = createWorkerPool(() => new HashWorker(), { size: 2 })

const fileHashes = ref<Record<string, string>>({})
const isComputing = ref(false)
const hashProgress = ref(0)
const textResults = ref<{ name: string; value: string }[]>([])
const textHashNotice = ref('')

function onHistorySelect(item: { data: { input: string } }) {
  input.value = item.data.input
}

async function computeTextHashes() {
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
  const lease = await hashWorkerPool.acquire()
  try {
    textHashNotice.value = ''
    const result = await lease.send<Record<string, string>>({ type: 'text', text })
    textResults.value = Object.entries(result).map(([name, value]) => ({ name, value }))
  } catch {
    textResults.value = []
  } finally {
    lease.release()
  }
}

const { isComputing: isTextComputing } = useDebouncedCompute(input, computeTextHashes, { delay: 220 })

function clearAll() {
  reset()
  fileHandler.removeFile()
  fileHashes.value = {}
}

function setFile(f: File) {
  if (!fileHandler.setFile(f)) return
  input.value = ''
  computeFileHash()
}

async function computeFileHash() {
  const file = fileHandler.file.value
  if (!file) return
  isComputing.value = true
  hashProgress.value = 0
  fileHashes.value = {}

  const lease = await hashWorkerPool.acquire()
  try {
    const { sessionId } = await lease.send<{ sessionId: string }>({ type: 'file-start' })
    const stream = file.stream()
    const reader = stream.getReader()
    let readBytes = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      readBytes += value.byteLength
      hashProgress.value = Math.round((readBytes / file.size) * 100)
      const chunk = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
      await lease.send({ type: 'file-chunk', sessionId, chunk }, [chunk])
    }

    fileHashes.value = await lease.send<Record<string, string>>({ type: 'file-finish', sessionId })
  } catch {
    fileHashes.value = { 错误: '计算出错' }
  } finally {
    lease.release()
    isComputing.value = false
    hashProgress.value = 0
  }
}

function onFiles(files: File[]) {
  const [first] = files
  if (first) setFile(first)
}

const displayResults = computed(() => {
  if (fileHandler.file.value) {
    return Object.entries(fileHashes.value).map(([name, value]) => ({ name, value }))
  }
  return textResults.value
})
</script>

<template>
  <ToolLayout max-width="3xl">
    <UCard class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="mb-4 flex items-center justify-between">
        <span class="text-sm font-medium text-on-surface-variant">输入内容</span>
        <div class="flex items-center gap-2">
          <HistoryPanel
            :items="history.items.value"
            @select="onHistorySelect"
            @remove="history.remove"
            @clear="history.clear"
          />
          <UButton
            variant="ghost"
            color="neutral"
            @click="clearAll"
            class="rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-variant transition-colors"
          >
            清空
          </UButton>
        </div>
      </div>

      <FileDropZone
        v-if="!fileHandler.file.value"
        title="拖拽文件到此处，或点击上传"
        hint="支持 Worker 分块计算 MD5 / SHA1 / SHA256 / SHA512，单文件最大 2GB"
        @files="onFiles"
      />

      <div
        v-else
        class="flex items-center justify-between rounded-xl bg-primary-container/30 px-4 py-3"
      >
        <div class="min-w-0">
          <div class="truncate text-sm font-medium text-on-surface">{{ fileHandler.file.value.name }}</div>
          <div class="text-xs text-on-surface-variant">{{ fileHandler.formatSize(fileHandler.file.value.size) }}</div>
        </div>
        <UButton
          variant="ghost"
          color="neutral"
          @click="fileHandler.removeFile(); fileHashes = {}"
          class="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
        >
          <X class="h-4 w-4 text-on-surface-variant" />
        </UButton>
      </div>

      <textarea
        v-if="!fileHandler.file.value"
        v-model="input"
        @blur="saveHistory"
        placeholder="输入要计算哈希的内容..."
        class="mt-4 h-40 w-full resize-none rounded-xl border border-outline bg-surface p-4 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div v-if="textHashNotice" class="mt-2 text-xs text-on-surface-variant">
        {{ textHashNotice }}
      </div>

      <UProgress
        v-if="isComputing && fileHandler.file.value"
        v-model="hashProgress"
        :max="100"
        color="primary"
        class="mt-3"
      />
    </UCard>

    <div class="space-y-3">
      <ResultPanel
        v-for="item in displayResults"
        :key="item.name"
        :title="item.name"
        :value="item.value"
        :copyable="!!item.value && !item.value.startsWith('SM3') && !item.value.startsWith('错误')"
      >
        <span v-if="isComputing && fileHandler.file.value" class="text-on-surface-variant">计算中 {{ hashProgress }}%</span>
        <span v-else>{{ item.value || '等待输入...' }}</span>
      </ResultPanel>
    </div>
  </ToolLayout>
</template>
