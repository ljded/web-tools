<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import type * as Monaco from 'monaco-editor'
import { useColorMode, useDebounceFn } from '@vueuse/core'
import { applyChineseLocale } from '@/utils/monaco'

const props = defineProps<{
  modelValue?: string
  original?: string
  modified?: string
  language?: string
  diff?: boolean
  readOnly?: boolean
  options?: Monaco.editor.IStandaloneEditorConstructionOptions | Monaco.editor.IStandaloneDiffEditorConstructionOptions
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:original', value: string): void
  (e: 'update:modified', value: string): void
  (e: 'blur'): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let monacoApi: typeof Monaco | null = null
let editorInstance: Monaco.editor.IStandaloneCodeEditor | Monaco.editor.IStandaloneDiffEditor | null = null
let originalModel: Monaco.editor.ITextModel | null = null
let modifiedModel: Monaco.editor.ITextModel | null = null
let disposed = false
let preventUpdateFromProps = false // 防止 props 更新时的循环触发
const colorMode = useColorMode()

function getTheme() {
  return colorMode.value === 'dark' ? 'vs-dark' : 'vs'
}

onMounted(async () => {
  const monaco = await import('monaco-editor')
  monacoApi = monaco
  applyChineseLocale()
  if (disposed || !containerRef.value) return

  if (props.diff) {
    const diffEditor = monaco.editor.createDiffEditor(containerRef.value, {
      theme: getTheme(),
      automaticLayout: true,
      renderSideBySide: true,         // 强制并排显示
      renderIndicators: true,          // 显示差异指示器
      enableSplitViewResizing: true,   // 允许调整分栏大小
      ignoreTrimWhitespace: false,     // 不忽略空格差异
      renderOverviewRuler: true,       // 显示概览标尺
      scrollBeyondLastLine: false,
      minimap: { enabled: true },      // 启用小地图
      // 注意：不设置 readOnly，让左右两侧都可编辑
      ...((props.options as Monaco.editor.IStandaloneDiffEditorConstructionOptions) || {}),
    })

    // 确保强制使用并排模式
    if (diffEditor.updateOptions) {
      diffEditor.updateOptions({
        renderSideBySide: true,
      })
    }

    originalModel = monaco.editor.createModel(props.original || '', props.language || 'text')
    modifiedModel = monaco.editor.createModel(props.modified || '', props.language || 'text')
    diffEditor.setModel({ original: originalModel, modified: modifiedModel })

    // 确保左侧编辑器可编辑
    diffEditor.getOriginalEditor().updateOptions({ readOnly: false })
    diffEditor.getModifiedEditor().updateOptions({ readOnly: false })

    diffEditor.getOriginalEditor().onDidChangeModelContent(() => {
      if (preventUpdateFromProps) return
      emit('update:original', diffEditor.getOriginalEditor().getValue())
    })
    diffEditor.getModifiedEditor().onDidChangeModelContent(() => {
      if (preventUpdateFromProps) return
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
      ...((props.options as Monaco.editor.IStandaloneEditorConstructionOptions) || {}),
    })

    standaloneEditor.onDidChangeModelContent(() => {
      if (preventUpdateFromProps) return
      emit('update:modelValue', standaloneEditor.getValue())
    })
    standaloneEditor.onDidBlurEditorWidget(() => emit('blur'))

    editorInstance = standaloneEditor
  }
})

watch(
  () => colorMode.value,
  () => {
    monacoApi?.editor.setTheme(getTheme())
  },
)

// 防抖更新编辑器值，避免快速输入时频繁调用 setValue
const debouncedSetValue = useDebounceFn((editor: Monaco.editor.IStandaloneCodeEditor, value: string) => {
  if (disposed || !editor) return
  const currentValue = editor.getValue()
  if (currentValue !== value) {
    preventUpdateFromProps = true
    const position = editor.getPosition()
    const selection = editor.getSelection()
    editor.setValue(value)
    if (position) editor.setPosition(position)
    if (selection) editor.setSelection(selection)
    setTimeout(() => { preventUpdateFromProps = false }, 0)
  }
}, 100, { maxWait: 500 })

watch(
  () => props.modelValue,
  (val) => {
    if (!editorInstance || props.diff) return
    const standalone = editorInstance as Monaco.editor.IStandaloneCodeEditor
    debouncedSetValue(standalone, val || '')
  },
)

// 防抖更新 Diff 编辑器模型
const debouncedSetModelValue = useDebounceFn((model: Monaco.editor.ITextModel, value: string) => {
  if (disposed || !model) return
  if (model.getValue() !== value) {
    preventUpdateFromProps = true
    model.setValue(value)
    setTimeout(() => { preventUpdateFromProps = false }, 0)
  }
}, 100, { maxWait: 500 })

watch(
  () => props.original,
  (val) => {
    if (!editorInstance || !props.diff || !originalModel) return
    debouncedSetModelValue(originalModel, val || '')
  },
)

watch(
  () => props.modified,
  (val) => {
    if (!editorInstance || !props.diff || !modifiedModel) return
    debouncedSetModelValue(modifiedModel, val || '')
  },
)

onBeforeUnmount(() => {
  disposed = true
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
