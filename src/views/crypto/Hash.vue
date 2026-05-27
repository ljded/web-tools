<script setup lang="ts">
import { onUnmounted, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToolState, useFileHandler, useDebouncedCompute, useLatestTask } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import HashWorker from '@/workers/hash.worker?worker'
import { createWorkerPool } from '@/workers/pool'

const MAX_TEXT_HASH_CHARS = 400_000
const MAX_FILE_HASH_BYTES = 2 * 1024 * 1024 * 1024

const { t } = useI18n()

const { input, history, saveHistory, reset } = useToolState<string, { input: string }>({
  storageKey: 'hash',
  defaultInput: '',
  getHistoryData: (value) => ({ input: value }),
  historyOptions: {
    maxCount: 15,
    generateLabel: (d) => d.input.slice(0, 50) + (d.input.length > 50 ? '...' : ''),
  },
})

const fileHandler = useFileHandler({ maxSize: MAX_FILE_HASH_BYTES })
const hashWorkerPool = createWorkerPool(() => new HashWorker(), { size: 2 })
const latestTextHash = useLatestTask()
const latestFileHash = useLatestTask()

const fileHashes = ref<Record<string, string>>({})
const isComputing = ref(false)
const hashProgress = ref(0)
const textResults = ref<{ name: string; value: string }[]>([])
const textHashNotice = ref('')

function onHistorySelect(item: { data: { input: string } }) {
  input.value = item.data.input
}

async function computeTextHashes() {
  const isCurrent = latestTextHash.next()
  const text = input.value
  if (!text) {
    textResults.value = []
    textHashNotice.value = ''
    return
  }
  if (text.length > MAX_TEXT_HASH_CHARS) {
    textResults.value = []
    textHashNotice.value = t('tools.hash.textTooLong', { max: MAX_TEXT_HASH_CHARS.toLocaleString() })
    return
  }
  const lease = await hashWorkerPool.acquire()
  try {
    textHashNotice.value = ''
    const result = await lease.send<Record<string, string>>({ type: 'text', text })
    if (isCurrent()) textResults.value = Object.entries(result).map(([name, value]) => ({ name, value }))
  } catch {
    if (isCurrent()) textResults.value = []
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

function clearFile() {
  fileHandler.removeFile()
  fileHashes.value = {}
}

async function computeFileHash() {
  const isCurrent = latestFileHash.next()
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
      if (isCurrent()) hashProgress.value = Math.round((readBytes / file.size) * 100)
      const chunk = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
      await lease.send({ type: 'file-chunk', sessionId, chunk }, [chunk])
    }

    const result = await lease.send<Record<string, string>>({ type: 'file-finish', sessionId })
    if (isCurrent()) fileHashes.value = result
  } catch {
    if (isCurrent()) fileHashes.value = { [t('app.error')]: t('tools.hash.computeError') }
  } finally {
    lease.release()
    if (isCurrent()) {
      isComputing.value = false
      hashProgress.value = 0
    }
  }
}

onUnmounted(() => {
  latestTextHash.cancel()
  latestFileHash.cancel()
  hashWorkerPool.terminate()
})

function onFiles(files: File[]) {
  const [first] = files
  if (first) setFile(first)
}

function localizeHashValue(value: string) {
  if (value === '__hash_error:sm3_file_unsupported') return t('tools.hash.sm3NotSupported')
  return value
}

const displayResults = computed(() => {
  if (fileHandler.file.value) {
    return Object.entries(fileHashes.value).map(([name, value]) => ({ name, value: localizeHashValue(value) }))
  }
  return textResults.value
})
</script>

<template>
  <ToolPage name="hash" max-width="6xl" icon="i-lucide-fingerprint">
    <div class="tool-workspace">
      <ToolSection :title="$t('tools.hash.inputLabel')" :description="$t('tools.hash.inputDesc')">
      <template #actions>
        <HistoryPanel
          :items="history.items.value"
          @select="onHistorySelect"
          @remove="history.remove"
          @clear="history.clear"
        />
        <UButton
          :label="$t('app.clear')"
          color="neutral"
          variant="ghost"
          @click="clearAll"
          class="rounded-full"
        />
      </template>

      <FileDropZone
        v-if="!fileHandler.file.value"
        :title="$t('tools.hash.dropFile')"
        :hint="$t('tools.hash.fileHint')"
        @files="onFiles"
      />

      <div
        v-else
        class="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3"
      >
        <div class="min-w-0">
          <div class="truncate text-sm font-medium">{{ fileHandler.file.value.name }}</div>
          <div class="text-xs text-muted">{{ fileHandler.formatSize(fileHandler.file.value.size) }}</div>
        </div>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          @click="clearFile"
          class="rounded-full"
        />
      </div>

      <UTextarea
        v-if="!fileHandler.file.value"
        v-model="input"
        @blur="saveHistory"
        :placeholder="$t('tools.hash.placeholder')"
        :rows="8"
        autoresize
        :maxrows="12"
        class="mt-4 w-full"
      />
      <UAlert v-if="textHashNotice" class="mt-3" color="warning" variant="soft" icon="i-lucide-triangle-alert" :description="textHashNotice" />

      <UProgress
        v-if="isComputing && fileHandler.file.value"
        v-model="hashProgress"
        :max="100"
        class="mt-3"
      />

        <div v-if="displayResults.length" class="mt-4 space-y-3 lg:hidden">
          <ResultPanel
            v-for="item in displayResults"
            :key="item.name"
            :title="item.name"
            :value="item.value"
            :copyable="!!item.value && !item.value.startsWith('SM3') && item.name !== $t('app.error')"
            compact
          >
            <span v-if="isComputing && fileHandler.file.value" class="text-muted">{{ $t('tools.hash.progress', { progress: hashProgress }) }}</span>
            <span v-else>{{ item.value || $t('app.waitingForInput') }}</span>
          </ResultPanel>
        </div>
      </ToolSection>

      <div class="hidden space-y-3 lg:block tool-preview-sticky">
        <ResultPanel
          v-for="item in displayResults"
          :key="item.name"
          :title="item.name"
          :value="item.value"
          :copyable="!!item.value && !item.value.startsWith('SM3') && item.name !== $t('app.error')"
          max-height="160px"
          compact
        >
          <span v-if="isComputing && fileHandler.file.value" class="text-muted">{{ $t('tools.hash.progress', { progress: hashProgress }) }}</span>
          <span v-else>{{ item.value || $t('app.waitingForInput') }}</span>
        </ResultPanel>
        <ResultPanel v-if="!displayResults.length" :title="$t('app.result')" value="" :empty-text="$t('app.waitingForInput')" />
      </div>
    </div>
  </ToolPage>
</template>
