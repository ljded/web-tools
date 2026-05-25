<script setup lang="ts">
import { computed } from 'vue'
import CopyBtn from '@/components/CopyBtn.vue'
import MonacoEditor from '@/components/MonacoEditor.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'

const markdown = usePersistedRef(
  'web-tools:markdown:input',
  '# Web Tools\n\n- Local-first\n- Offline-capable\n\n`markdown` preview.',
)

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function formatMarkdown() {
  const formatted: string[] = []
  let previousWasBlank = true
  let inFence = false
  let listType: 'ordered' | 'unordered' | null = null

  const pushBlank = () => {
    if (!previousWasBlank) {
      formatted.push('')
      previousWasBlank = true
    }
    listType = null
  }

  for (const rawLine of markdown.value.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (/^```/.test(trimmed)) {
      if (!inFence) pushBlank()
      formatted.push(trimmed)
      previousWasBlank = false
      inFence = !inFence
      if (!inFence) pushBlank()
      continue
    }

    if (inFence) {
      formatted.push(line)
      previousWasBlank = false
      continue
    }

    if (!trimmed) {
      pushBlank()
      continue
    }

    const heading = trimmed.match(/^(#{1,6})\s*(.+)$/)
    if (heading) {
      pushBlank()
      formatted.push(`${heading[1]} ${heading[2]!.trim()}`)
      previousWasBlank = false
      pushBlank()
      continue
    }

    const unordered = trimmed.match(/^[-*+]\s*(.+)$/)
    if (unordered) {
      if (listType && listType !== 'unordered') pushBlank()
      formatted.push(`- ${unordered[1]!.trim()}`)
      previousWasBlank = false
      listType = 'unordered'
      continue
    }

    const ordered = trimmed.match(/^\d+[.)]\s*(.+)$/)
    if (ordered) {
      if (listType && listType !== 'ordered') pushBlank()
      const index = formatted.filter((item) => /^\d+\.\s+/.test(item)).length + 1
      formatted.push(`${index}. ${ordered[1]!.trim()}`)
      previousWasBlank = false
      listType = 'ordered'
      continue
    }

    if (listType) pushBlank()
    formatted.push(trimmed)
    previousWasBlank = false
  }

  markdown.value = formatted.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function insertTemplate() {
  markdown.value = '# 标题\n\n## 小节\n\n- 条目 1\n- 条目 2\n\n**重点** 和 `代码`。'
}

function clearMarkdown() {
  markdown.value = ''
}

const renderedHtml = computed(() => {
  const lines = markdown.value.split(/\r?\n/)
  const html: string[] = []
  let inList = false

  for (const line of lines) {
    const safe = escapeHtml(line)

    if (!safe.trim()) {
      if (inList) {
        html.push('</ul>')
        inList = false
      }
      html.push('')
      continue
    }

    if (/^###\s+/.test(safe)) {
      if (inList) {
        html.push('</ul>')
        inList = false
      }
      html.push(`<h3>${renderInline(safe.replace(/^###\s+/, ''))}</h3>`)
      continue
    }

    if (/^##\s+/.test(safe)) {
      if (inList) {
        html.push('</ul>')
        inList = false
      }
      html.push(`<h2>${renderInline(safe.replace(/^##\s+/, ''))}</h2>`)
      continue
    }

    if (/^#\s+/.test(safe)) {
      if (inList) {
        html.push('</ul>')
        inList = false
      }
      html.push(`<h1>${renderInline(safe.replace(/^#\s+/, ''))}</h1>`)
      continue
    }

    if (/^-\s+/.test(safe)) {
      if (!inList) {
        html.push('<ul>')
        inList = true
      }
      html.push(`<li>${renderInline(safe.replace(/^-\s+/, ''))}</li>`)
      continue
    }

    if (inList) {
      html.push('</ul>')
      inList = false
    }

    html.push(`<p>${renderInline(safe)}</p>`)
  }

  if (inList) html.push('</ul>')
  return html.join('\n')
})
</script>

<template>
  <ToolPage name="markdown" max-width="6xl" icon="i-lucide-file-text">
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ToolSection :title="$t('tools.markdown.editorTitle')" :description="$t('tools.markdown.editorDesc')" :padding="false">
        <div class="flex flex-wrap items-center gap-2 border-b border-default px-4 py-3">
          <UButton color="neutral" variant="ghost" class="rounded-full text-xs" icon="i-lucide-align-left" @click="formatMarkdown">格式化</UButton>
          <UButton color="neutral" variant="ghost" class="rounded-full text-xs" icon="i-lucide-file-plus" @click="insertTemplate">模板</UButton>
          <UButton color="neutral" variant="ghost" class="rounded-full text-xs" icon="i-lucide-eraser" @click="clearMarkdown">清空</UButton>
          <CopyBtn :text="markdown" variant="button" />
        </div>
        <div class="h-[460px]">
          <MonacoEditor v-model="markdown" language="markdown" :options="{ wordWrap: 'on', minimap: { enabled: false } }" />
        </div>
      </ToolSection>

      <ToolSection :title="$t('tools.markdown.previewTitle')" :description="$t('tools.markdown.previewDesc')">
        <template #actions>
          <CopyBtn :text="markdown" variant="button" />
        </template>
        <article
          class="markdown-preview max-w-none break-words text-default"
          v-html="renderedHtml"
        />
      </ToolSection>
    </div>
  </ToolPage>
</template>

<style scoped>
.markdown-preview :deep(h1) {
  margin: 0 0 1rem;
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.15;
  color: var(--ui-text-highlighted);
}

.markdown-preview :deep(h2) {
  margin: 1.5rem 0 0.75rem;
  font-size: 1.5rem;
  font-weight: 750;
  line-height: 1.2;
  color: var(--ui-text-highlighted);
}

.markdown-preview :deep(h3) {
  margin: 1.25rem 0 0.5rem;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--ui-text-highlighted);
}

.markdown-preview :deep(p) {
  margin: 0.75rem 0;
  line-height: 1.8;
}

.markdown-preview :deep(ul) {
  margin: 0.75rem 0;
  padding-left: 1.25rem;
  list-style: disc;
}

.markdown-preview :deep(li) {
  margin: 0.35rem 0;
  line-height: 1.7;
}

.markdown-preview :deep(code) {
  border-radius: 0.5rem;
  background: var(--ui-bg-elevated);
  padding: 0.125rem 0.375rem;
  font-size: 0.9em;
  color: var(--ui-text-highlighted);
}

.markdown-preview :deep(strong) {
  font-weight: 700;
  color: var(--ui-text-highlighted);
}
</style>
