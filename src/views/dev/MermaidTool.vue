<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import CopyBtn from '@/components/CopyBtn.vue'
import MonacoEditor from '@/components/MonacoEditor.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const { t } = useI18n()
const colorMode = useColorMode()
const diagram = usePersistedRef(
  'web-tools:mermaid:input',
  `flowchart TD
  A[Web Tools] --> B{Local first?}
  B -->|Yes| C[Edit diagrams offline]
  B -->|No| D[Keep data in the browser]
  C --> E[Export SVG]
  D --> E`,
)

const renderedSvg = ref('')
const renderError = ref('')
const rendering = ref(false)
let renderTimer: ReturnType<typeof setTimeout> | null = null
let renderSeq = 0

const previewMeta = computed(() => [
  { label: t('tools.mermaid.metaLines'), value: diagram.value.split(/\r?\n/).length },
  { label: t('tools.mermaid.metaChars'), value: diagram.value.length },
])

function insertTemplate() {
  diagram.value = t('tools.mermaid.templateContent')
}

function clearDiagram() {
  diagram.value = ''
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

function downloadSource() {
  downloadText(diagram.value, 'diagram.mmd', 'text/plain;charset=utf-8')
}

function downloadSvg() {
  if (!renderedSvg.value) return
  downloadText(renderedSvg.value, 'diagram.svg', 'image/svg+xml;charset=utf-8')
}

async function renderDiagram() {
  const source = diagram.value.trim()
  const seq = ++renderSeq
  if (!source) {
    renderedSvg.value = ''
    renderError.value = ''
    rendering.value = false
    return
  }

  rendering.value = true
  renderError.value = ''
  try {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: colorMode.value === 'dark' ? 'dark' : 'default',
    })
    await mermaid.parse(source)
    const { svg } = await mermaid.render(`web-tools-mermaid-${Date.now()}-${seq}`, source)
    if (seq === renderSeq) renderedSvg.value = svg
  } catch (error) {
    if (seq !== renderSeq) return
    renderedSvg.value = ''
    renderError.value = error instanceof Error ? error.message : t('tools.mermaid.renderFailed')
  } finally {
    if (seq === renderSeq) rendering.value = false
  }
}

function scheduleRender() {
  if (renderTimer) clearTimeout(renderTimer)
  renderTimer = setTimeout(() => {
    void renderDiagram()
  }, 220)
}

watch([diagram, () => colorMode.value], scheduleRender, { immediate: true })

onBeforeUnmount(() => {
  if (renderTimer) clearTimeout(renderTimer)
})
</script>

<template>
  <ToolPage name="mermaid" max-width="6xl" icon="i-lucide-git-branch-plus">
    <div class="tool-workspace">
      <ToolSection :title="$t('tools.mermaid.editorTitle')" :description="$t('tools.mermaid.editorDesc')" :padding="false">
        <div class="tool-command-bar m-4 justify-between">
          <div class="flex flex-wrap items-center gap-2">
            <UButton color="neutral" variant="ghost" class="rounded-full text-xs" icon="i-lucide-file-plus" @click="insertTemplate">
              {{ $t('tools.mermaid.template') }}
            </UButton>
            <UButton color="neutral" variant="ghost" class="rounded-full text-xs" icon="i-lucide-refresh-cw" :loading="rendering" @click="renderDiagram">
              {{ $t('tools.mermaid.render') }}
            </UButton>
            <UButton color="neutral" variant="ghost" class="rounded-full text-xs" icon="i-lucide-eraser" @click="clearDiagram">
              {{ $t('app.clear') }}
            </UButton>
            <UButton color="neutral" variant="ghost" class="rounded-full text-xs" icon="i-lucide-download" :disabled="!diagram" @click="downloadSource">
              {{ $t('tools.mermaid.downloadSource') }}
            </UButton>
          </div>
          <CopyBtn :text="diagram" variant="button" />
        </div>
        <div class="h-[560px] overflow-hidden rounded-b-[1.75rem]">
          <MonacoEditor v-model="diagram" language="markdown" :options="{ wordWrap: 'on', minimap: { enabled: false } }" />
        </div>
      </ToolSection>

      <div class="tool-preview-sticky">
        <ToolSection :title="$t('tools.mermaid.previewTitle')" :description="$t('tools.mermaid.previewDesc')">
          <template #actions>
            <UButton color="neutral" variant="ghost" class="rounded-full text-xs" icon="i-lucide-file-code" :disabled="!renderedSvg" @click="downloadSvg">
              {{ $t('tools.mermaid.downloadSvg') }}
            </UButton>
            <CopyBtn :text="renderedSvg" variant="button" />
          </template>

          <div v-if="previewMeta.length" class="mb-3 flex flex-wrap gap-2">
            <UBadge v-for="item in previewMeta" :key="item.label" color="neutral" variant="soft" size="xs" class="rounded-full">
              {{ item.label }}: {{ item.value }}
            </UBadge>
          </div>

          <UAlert v-if="renderError" color="error" variant="soft" icon="i-lucide-circle-alert" :title="$t('tools.mermaid.invalidSyntax')" :description="renderError" class="mb-3" />

          <div class="mermaid-preview hig-subtle-surface min-h-[22rem] overflow-auto rounded-[1.35rem] border p-4 text-default sm:p-5">
            <div v-if="rendering" class="flex min-h-72 items-center justify-center">
              <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
            </div>
            <div v-else-if="renderedSvg" class="flex min-h-72 items-center justify-center" v-html="renderedSvg" />
            <div v-else class="flex min-h-72 items-center justify-center text-center text-sm text-muted">
              {{ $t('tools.mermaid.emptyPreview') }}
            </div>
          </div>
        </ToolSection>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.mermaid-preview :deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
