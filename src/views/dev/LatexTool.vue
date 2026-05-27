<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import CopyBtn from '@/components/CopyBtn.vue'
import MonacoEditor from '@/components/MonacoEditor.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const { t } = useI18n()
const latex = usePersistedRef('web-tools:latex:input', String.raw`\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}`)
const displayMode = usePersistedRef<'block' | 'inline'>('web-tools:latex:display-mode', 'block')

const displayModeItems = computed(() => [
  { label: t('tools.latex.blockMode'), value: 'block' },
  { label: t('tools.latex.inlineMode'), value: 'inline' },
])

const renderedHtml = computed(() => {
  const source = latex.value.trim()
  if (!source) return ''

  return katex.renderToString(source, {
    displayMode: displayMode.value === 'block',
    throwOnError: false,
    trust: false,
    strict: 'warn',
    output: 'html',
  })
})

function insertTemplate() {
  latex.value = t('tools.latex.templateContent')
}

function clearLatex() {
  latex.value = ''
}

function downloadSource() {
  const blob = new Blob([latex.value], { type: 'text/x-tex;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = 'formula.tex'
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <ToolPage name="latex" max-width="6xl" icon="i-lucide-square-function">
    <div class="tool-workspace">
      <ToolSection :title="$t('tools.latex.editorTitle')" :description="$t('tools.latex.editorDesc')" :padding="false">
        <div class="tool-command-bar m-4 justify-between">
          <div class="flex flex-wrap items-center gap-2">
            <USelect
              v-model="displayMode"
              :items="displayModeItems"
              color="neutral"
              variant="soft"
              size="sm"
              class="w-32"
            />
            <UButton color="neutral" variant="ghost" class="rounded-full text-xs" icon="i-lucide-file-plus" @click="insertTemplate">
              {{ $t('tools.latex.template') }}
            </UButton>
            <UButton color="neutral" variant="ghost" class="rounded-full text-xs" icon="i-lucide-eraser" @click="clearLatex">
              {{ $t('app.clear') }}
            </UButton>
            <UButton color="neutral" variant="ghost" class="rounded-full text-xs" icon="i-lucide-download" :disabled="!latex" @click="downloadSource">
              {{ $t('tools.latex.downloadSource') }}
            </UButton>
          </div>
          <CopyBtn :text="latex" variant="button" />
        </div>
        <div class="h-[560px] overflow-hidden rounded-b-[1.75rem]">
          <MonacoEditor v-model="latex" language="latex" :options="{ wordWrap: 'on', minimap: { enabled: false } }" />
        </div>
      </ToolSection>

      <div class="tool-preview-sticky">
        <ToolSection :title="$t('tools.latex.previewTitle')" :description="$t('tools.latex.previewDesc')">
          <template #actions>
            <CopyBtn :text="renderedHtml" variant="button" />
          </template>
          <div class="latex-preview hig-subtle-surface min-h-[18rem] overflow-auto rounded-[1.35rem] border p-5 text-default sm:p-6">
            <div v-if="renderedHtml" class="flex min-h-48 items-center justify-center" v-html="renderedHtml" />
            <div v-else class="flex min-h-48 items-center justify-center text-sm text-muted">
              {{ $t('tools.latex.emptyPreview') }}
            </div>
          </div>
        </ToolSection>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.latex-preview :deep(.katex-display) {
  margin: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5rem 0;
}

.latex-preview :deep(.katex) {
  color: var(--ui-text-highlighted);
  font-size: 1.25rem;
}
</style>
