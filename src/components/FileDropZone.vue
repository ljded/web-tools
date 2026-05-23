<script setup lang="ts">
import { ref } from 'vue'

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
const selectedFiles = ref<File | File[] | null>(null)

function onUpdate(files: File | File[] | null | undefined) {
  selectedFiles.value = files ?? null
  if (!files) return
  emit('files', Array.isArray(files) ? files : [files])
}
</script>

<template>
  <UFileUpload
    :model-value="selectedFiles"
    :accept="accept"
    :multiple="multiple"
    :disabled="disabled"
    :label="title"
    :description="hint || undefined"
    icon="i-lucide-file-up"
    variant="area"
    size="lg"
    :reset="true"
    :preview="false"
    :ui="{ base: 'rounded-2xl hover:border-primary hover:bg-primary/5', icon: 'text-primary' }"
    @update:model-value="onUpdate"
  >
    <template #leading>
      <slot name="icon"><UIcon name="i-lucide-file-up" class="size-6 text-primary" /></slot>
    </template>
  </UFileUpload>
</template>
