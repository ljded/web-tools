<script setup lang="ts">
import { ref } from 'vue'
import CopyBtn from '@/components/CopyBtn.vue'
import MonacoEditor from '@/components/MonacoEditor.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

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

let worker: Worker | null = null

function getWorker(): Worker {
  if (worker) return worker

  const source = `self.onmessage = async (event) => {
    const { code, input } = event.data
    const logs = []
    const safeConsole = {
      log: (...args) => logs.push(args.map((arg) => String(arg)).join(' ')),
      error: (...args) => logs.push('[error] ' + args.map((arg) => String(arg)).join(' ')),
      warn: (...args) => logs.push('[warn] ' + args.map((arg) => String(arg)).join(' ')),
    }

    try {
      const fn = new Function('input', 'console', code)
      const result = await fn(input, safeConsole)
      self.postMessage({ ok: true, result, logs })
    } catch (error) {
      self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error), logs })
    }
  }`

  worker = new Worker(URL.createObjectURL(new Blob([source], { type: 'application/javascript' })))
  return worker
}

function formatEditor(editorRef: InstanceType<typeof MonacoEditor> | null) {
  const editor = editorRef?.getEditor()
  if (editor && 'getAction' in editor) {
    ;(editor as any).getAction('editor.action.formatDocument')?.run()
  }
}

function formatInputJson() {
  try {
    inputJson.value = JSON.stringify(JSON.parse(inputJson.value), null, 2)
  } catch {
    formatEditor(inputEditorRef.value)
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
    output.value = 'Invalid JSON input'
    logs.value = []
    return
  }

  isRunning.value = true
  output.value = ''
  logs.value = []

  await new Promise<void>((resolve) => {
    const instance = getWorker()

    const handler = (event: MessageEvent<{ ok: boolean; result?: unknown; error?: string; logs: string[] }>) => {
      instance.removeEventListener('message', handler)
      logs.value = event.data.logs
      output.value = event.data.ok
        ? JSON.stringify(event.data.result, null, 2)
        : `Error: ${event.data.error ?? 'Unknown error'}`
      isRunning.value = false
      resolve()
    }

    instance.addEventListener('message', handler)
    instance.postMessage({ code: code.value, input: parsedInput })
  })
}
</script>

<template>
  <ToolPage name="js-sandbox" max-width="6xl" icon="i-lucide-square-terminal">
    <ToolSection compact>
      <div class="flex flex-wrap items-center gap-2">
        <UButton color="primary" class="rounded-full" icon="i-lucide-play" :loading="isRunning" @click="runCode">
          {{ $t('tools.jsSandbox.run') }}
        </UButton>
        <UButton color="neutral" variant="ghost" class="rounded-full" icon="i-lucide-align-left" @click="formatEditor(codeEditorRef)">
          格式化代码
        </UButton>
        <UButton color="neutral" variant="ghost" class="rounded-full" icon="i-lucide-braces" @click="formatInputJson">
          格式化输入
        </UButton>
        <UButton color="neutral" variant="ghost" class="rounded-full" icon="i-lucide-eraser" @click="clearOutput">
          清空输出
        </UButton>
      </div>
    </ToolSection>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ToolSection :title="$t('tools.jsSandbox.codeTitle')" :description="$t('tools.jsSandbox.codeDesc')" :padding="false">
        <div class="h-[420px]">
          <MonacoEditor ref="codeEditorRef" v-model="code" language="javascript" :options="{ wordWrap: 'on', minimap: { enabled: false } }" />
        </div>
      </ToolSection>

      <ToolSection :title="$t('tools.jsSandbox.inputTitle')" :description="$t('tools.jsSandbox.inputDesc')" :padding="false">
        <div class="h-[420px]">
          <MonacoEditor ref="inputEditorRef" v-model="inputJson" language="json" :options="{ wordWrap: 'on', minimap: { enabled: false } }" />
        </div>
      </ToolSection>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ResultPanel :title="$t('tools.jsSandbox.outputTitle')" :value="output" pre-wrap>
        <template #actions>
          <CopyBtn :text="output" variant="button" :disabled="!output" />
        </template>
      </ResultPanel>

      <ResultPanel :title="$t('tools.jsSandbox.logsTitle')" :value="logs.join('\n')" pre-wrap>
        <template #actions>
          <CopyBtn :text="logs.join('\n')" variant="button" :disabled="!logs.length" />
        </template>
      </ResultPanel>
    </div>
  </ToolPage>
</template>
