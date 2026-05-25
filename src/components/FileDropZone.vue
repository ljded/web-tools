<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

withDefaults(
  defineProps<{
    accept?: string
    multiple?: boolean
    disabled?: boolean
    title?: string
    hint?: string
    icon?: string
    uiBase?: string
  }>(),
  {
    accept: undefined,
    multiple: false,
    disabled: false,
    title: undefined,
    hint: '',
    icon: 'i-lucide-file-up',
    uiBase: 'rounded-3xl border-default/70 bg-default/55 shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/10',
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
    :label="title || t('app.fileDropDefaultTitle')"
    :description="hint || undefined"
    :icon="icon"
    variant="area"
    size="lg"
    :reset="true"
    :preview="false"
    :ui="{ base: `${uiBase} focus-visible:hig-focus`, icon: 'text-primary' }"
    @update:model-value="onUpdate"
  >
    <template #leading>
      <slot name="icon"><UIcon :name="icon" class="size-6 text-primary" /></slot>
    </template>
  </UFileUpload>
</template>
