<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import MonacoEditor from '@/components/MonacoEditor.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const { t } = useI18n()
const code = usePersistedRef(
  'web-tools:js-sandbox:code',
  "const sum = input.numbers.reduce((a, b) => a + b, 0);\nconsole.log('sum=', sum);\nreturn { sum, avg: sum / input.numbers.length }",
)
const inputJson = usePersistedRef('web-tools:js-sandbox:input', '{\n  "numbers": [1, 2, 3, 4, 5]\n}')
const output = ref('')
const logs = ref<string[]>([])
const isRunning = ref(false)
const codeEditorRef = ref<InstanceType<typeof MonacoEditor> | null>(null)
const inputEditorRef = ref<InstanceType<typeof MonacoEditor> | null>(null)

const RUN_TIMEOUT_MS = 3000

function createWorker(): Worker {
  const source = `
  const MAX_LOGS = 200
  const MAX_LOG_LENGTH = 2000
  const MAX_RESULT_LENGTH = 100000
  const blocked = () => { throw new Error('Network and dynamic import APIs are disabled in this sandbox') }
  self.fetch = blocked
  self.XMLHttpRequest = undefined
  self.WebSocket = undefined
  self.EventSource = undefined
  self.importScripts = blocked

  function truncate(text, max) {
    return text.length > max ? text.slice(0, max) + '\\n...[truncated]' : text
  }

  function stringifyArg(arg) {
    if (typeof arg === 'string') return arg
    try { return JSON.stringify(arg) }
    catch { return String(arg) }
  }

  function serializeResult(value) {
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return truncate(value, MAX_RESULT_LENGTH)
    try {
      return truncate(JSON.stringify(value, null, 2), MAX_RESULT_LENGTH)
    } catch {
      return truncate(String(value), MAX_RESULT_LENGTH)
    }
  }

  self.onmessage = async (event) => {
    const { code, input } = event.data
    const logs = []
    const pushLog = (prefix, args) => {
      if (logs.length >= MAX_LOGS) return
      const text = args.map(stringifyArg).join(' ')
      logs.push(truncate(prefix + text, MAX_LOG_LENGTH))
    }
    const safeConsole = {
      log: (...args) => pushLog('', args),
      error: (...args) => pushLog('[error] ', args),
      warn: (...args) => pushLog('[warn] ', args),
    }

    try {
      const fn = new Function('input', 'console', code)
      const result = await fn(input, safeConsole)
      self.postMessage({ ok: true, resultText: serializeResult(result), logs })
    } catch (error) {
      self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error), logs })
    }
  }`

  const url = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }))
  const worker = new Worker(url)
  URL.revokeObjectURL(url)
  return worker
}

async function formatEditor(editorRef: InstanceType<typeof MonacoEditor> | null) {
  await editorRef?.ensureRichLanguageService()
  const editor = editorRef?.getEditor()
  if (editor && 'getAction' in editor) {
    ;(editor as any).getAction('editor.action.formatDocument')?.run()
  }
}

function formatInputJson() {
  try {
    inputJson.value = JSON.stringify(JSON.parse(inputJson.value), null, 2)
  } catch {
    void formatEditor(inputEditorRef.value)
  }
}

function clearOutput() {
  output.value = ''
  logs.value = []
}

async function runCode() {
  let parsedInput: unknown
  try {
    parsedInput = JSON.parse(inputJson.value)
  } catch {
    output.value = t('tools.jsSandbox.invalidJsonInput')
    logs.value = []
    return
  }

  isRunning.value = true
  output.value = ''
  logs.value = []

  await new Promise<void>((resolve) => {
    const instance = createWorker()
    const timeout = window.setTimeout(() => {
      instance.terminate()
      output.value = t('tools.jsSandbox.timeout', { seconds: Math.round(RUN_TIMEOUT_MS / 1000) })
      logs.value = []
      isRunning.value = false
      resolve()
    }, RUN_TIMEOUT_MS)

    let handler: ((event: MessageEvent<{ ok: boolean; resultText?: string; error?: string; logs: string[] }>) => void) | null = null
    let errorHandler: ((event: ErrorEvent) => void) | null = null

    const cleanup = () => {
      window.clearTimeout(timeout)
      if (handler) instance.removeEventListener('message', handler)
      if (errorHandler) instance.removeEventListener('error', errorHandler)
      instance.terminate()
    }

    handler = (event: MessageEvent<{ ok: boolean; resultText?: string; error?: string; logs: string[] }>) => {
      cleanup()
      logs.value = event.data.logs
      output.value = event.data.ok
        ? (event.data.resultText ?? '')
        : `Error: ${event.data.error ?? 'Unknown error'}`
      isRunning.value = false
      resolve()
    }

    errorHandler = (event: ErrorEvent) => {
      cleanup()
      logs.value = []
      output.value = `Error: ${event.message || 'Worker execution failed'}`
      isRunning.value = false
      resolve()
    }

    instance.addEventListener('message', handler)
    instance.addEventListener('error', errorHandler)
    instance.postMessage({ code: code.value, input: parsedInput })
  })
}
</script>

<template>
  <ToolPage name="js-sandbox" max-width="6xl" icon="i-lucide-square-terminal">
    <ToolSection compact>
      <template #actions>
        <UButton color="primary" variant="soft" size="sm" class="rounded-full" icon="i-lucide-play" :loading="isRunning" @click="runCode">
          {{ $t('tools.jsSandbox.run') }}
        </UButton>
        <UButton color="neutral" variant="soft" size="sm" class="rounded-full" icon="i-lucide-align-left" @click="formatEditor(codeEditorRef)">
          {{ $t('tools.jsSandbox.formatCode') }}
        </UButton>
        <UButton color="neutral" variant="soft" size="sm" class="rounded-full" icon="i-lucide-braces" @click="formatInputJson">
          {{ $t('tools.jsSandbox.formatInput') }}
        </UButton>
        <UButton color="neutral" variant="soft" size="sm" class="rounded-full" icon="i-lucide-eraser" @click="clearOutput">
          {{ $t('tools.jsSandbox.clearOutput') }}
        </UButton>
      </template>
    </ToolSection>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
      <div class="space-y-4">
        <ToolSection :title="$t('tools.jsSandbox.codeTitle')" :description="$t('tools.jsSandbox.codeDesc')" :padding="false">
          <div class="h-[460px] overflow-hidden rounded-b-[1.75rem]">
            <MonacoEditor ref="codeEditorRef" v-model="code" language="javascript" :options="{ wordWrap: 'on', minimap: { enabled: false } }" />
          </div>
        </ToolSection>

        <ToolSection :title="$t('tools.jsSandbox.inputTitle')" :description="$t('tools.jsSandbox.inputDesc')" :padding="false">
          <div class="h-[260px] overflow-hidden rounded-b-[1.75rem]">
            <MonacoEditor ref="inputEditorRef" v-model="inputJson" language="json" :options="{ wordWrap: 'on', minimap: { enabled: false } }" />
          </div>
        </ToolSection>
      </div>

      <div class="tool-preview-sticky space-y-4">
        <ResultPanel :title="$t('tools.jsSandbox.outputTitle')" :value="output" pre-wrap max-height="360px" />
        <ResultPanel :title="$t('tools.jsSandbox.logsTitle')" :value="logs.join('\n')" pre-wrap max-height="260px" />
      </div>
    </div>
  </ToolPage>
</template>
