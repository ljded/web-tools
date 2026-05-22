<script setup lang="ts">
import { ref } from 'vue'
import { FileUp } from '@lucide/vue'

withDefaults(
  defineProps<{
    accept?: string
    multiple?: boolean
    disabled?: boolean
    title?: string
    hint?: string
  }>(),
  {
    accept: undefined,
    multiple: false,
    disabled: false,
    title: '拖拽文件到此处，或点击上传',
    hint: '',
  },
)

const emit = defineEmits<{ files: [files: File[]] }>()
const inputRef = ref<HTMLInputElement | null>(null)

function openPicker() {
  if (!inputRef.value) return
  inputRef.value.value = ''
  inputRef.value.click()
}

function emitFiles(files: FileList | null | undefined) {
  if (!files?.length) return
  emit('files', Array.from(files))
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer?.files) emitFiles(event.dataTransfer.files)
}
</script>

<template>
  <UButton
    type="button"
    variant="ghost"
    color="neutral"
    :disabled="disabled"
    class="flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-outline bg-surface/60 p-6 text-center transition-colors hover:border-primary hover:bg-primary-container/20 disabled:cursor-not-allowed disabled:opacity-60"
    @dragover.prevent
    @drop="onDrop"
    @click="openPicker"
  >
    <slot name="icon"><FileUp class="mb-2 h-6 w-6 text-primary" /></slot>
    <span class="text-sm font-medium text-on-surface">{{ title }}</span>
    <span v-if="hint" class="mt-1 text-xs text-on-surface-variant">{{ hint }}</span>
    <input
      ref="inputRef"
      type="file"
      class="hidden"
      :accept="accept"
      :multiple="multiple"
      @change="emitFiles(($event.target as HTMLInputElement).files)"
    />
  </UButton>
</template>
