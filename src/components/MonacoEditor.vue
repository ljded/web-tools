<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { useColorMode } from '@vueuse/core'
import { applyChineseLocale } from '@/utils/monaco'

const props = defineProps<{
  modelValue?: string
  original?: string
  modified?: string
  language?: string
  diff?: boolean
  readOnly?: boolean
  options?: monaco.editor.IStandaloneEditorConstructionOptions | monaco.editor.IStandaloneDiffEditorConstructionOptions
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:original', value: string): void
  (e: 'update:modified', value: string): void
  (e: 'blur'): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let editorInstance: monaco.editor.IStandaloneCodeEditor | monaco.editor.IStandaloneDiffEditor | null = null
let originalModel: monaco.editor.ITextModel | null = null
let modifiedModel: monaco.editor.ITextModel | null = null
const colorMode = useColorMode()

function getTheme() {
  return colorMode.value === 'dark' ? 'vs-dark' : 'vs'
}

onMounted(() => {
  applyChineseLocale()
  if (!containerRef.value) return

  if (props.diff) {
    const diffEditor = monaco.editor.createDiffEditor(containerRef.value, {
      theme: getTheme(),
      automaticLayout: true,
      renderSideBySide: true,
      readOnly: props.readOnly ?? false,
      ...((props.options as monaco.editor.IStandaloneDiffEditorConstructionOptions) || {}),
    })

    originalModel = monaco.editor.createModel(props.original || '', props.language || 'text')
    modifiedModel = monaco.editor.createModel(props.modified || '', props.language || 'text')
    diffEditor.setModel({ original: originalModel, modified: modifiedModel })

    diffEditor.getOriginalEditor().onDidChangeModelContent(() => {
      emit('update:original', diffEditor.getOriginalEditor().getValue())
    })
    diffEditor.getModifiedEditor().onDidChangeModelContent(() => {
      emit('update:modified', diffEditor.getModifiedEditor().getValue())
    })
    diffEditor.getOriginalEditor().onDidBlurEditorWidget(() => emit('blur'))
    diffEditor.getModifiedEditor().onDidBlurEditorWidget(() => emit('blur'))

    editorInstance = diffEditor
  } else {
    const standaloneEditor = monaco.editor.create(containerRef.value, {
      value: props.modelValue || '',
      language: props.language || 'text',
      theme: getTheme(),
      automaticLayout: true,
      minimap: { enabled: false },
      readOnly: props.readOnly ?? false,
      scrollBeyondLastLine: false,
      ...((props.options as monaco.editor.IStandaloneEditorConstructionOptions) || {}),
    })

    standaloneEditor.onDidChangeModelContent(() => {
      emit('update:modelValue', standaloneEditor.getValue())
    })
    standaloneEditor.onDidBlurEditorWidget(() => emit('blur'))

    editorInstance = standaloneEditor
  }
})

watch(
  () => colorMode.value,
  () => {
    monaco.editor.setTheme(getTheme())
  },
)

watch(
  () => props.modelValue,
  (val) => {
    if (!editorInstance || props.diff) return
    const standalone = editorInstance as monaco.editor.IStandaloneCodeEditor
    if (standalone.getValue() !== val) {
      standalone.setValue(val || '')
    }
  },
)

watch(
  () => props.original,
  (val) => {
    if (!editorInstance || !props.diff) return
    const model = originalModel
    if (model && model.getValue() !== val) {
      model.setValue(val || '')
    }
  },
)

watch(
  () => props.modified,
  (val) => {
    if (!editorInstance || !props.diff) return
    const model = modifiedModel
    if (model && model.getValue() !== val) {
      model.setValue(val || '')
    }
  },
)

onBeforeUnmount(() => {
  if (editorInstance) {
    editorInstance.dispose()
    editorInstance = null
  }
  if (originalModel) {
    originalModel.dispose()
    originalModel = null
  }
  if (modifiedModel) {
    modifiedModel.dispose()
    modifiedModel = null
  }
})

function getEditor() {
  return editorInstance
}

defineExpose({ getEditor })
</script>

<template>
  <div ref="containerRef" class="h-full w-full" />
</template>
