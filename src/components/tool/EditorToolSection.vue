/**
 * 编辑器工具专用组件
 * 用于 MarkdownTool, LatexTool, MermaidTool 等编辑器类工具
 */

<script setup lang="ts">
import { computed } from 'vue'
import ToolSection from './ToolSection.vue'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    editorTitle?: string
    editorDescription?: string
    previewTitle?: string
    previewDescription?: string
    compact?: boolean
    maxWidth?: string
    padding?: boolean
  }>(),
  {
    compact: false,
    padding: true,
  }
)

const hasEditorActions = computed(() => !!useSlots().editorActions)
const hasPreviewActions = computed(() => !!useSlots().previewActions)
</script>

<template>
  <div class="tool-workspace">
    <!-- 编辑器部分 -->
    <ToolSection
      :title="editorTitle || title"
      :description="editorDescription || description"
      :compact="compact"
      :padding="padding"
    >
      <template v-if="hasEditorActions" #actions>
        <slot name="editorActions" />
      </template>
      <slot name="editor" />
    </ToolSection>

    <!-- 预览部分 -->
    <div class="tool-preview-sticky">
      <ToolSection
        :title="previewTitle"
        :description="previewDescription"
        :compact="compact"
      >
        <template v-if="hasPreviewActions" #actions>
          <slot name="previewActions" />
        </template>
        <slot name="preview" />
      </ToolSection>
    </div>
  </div>
</template>

<style scoped>
.tool-workspace {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 1280px) {
  .tool-workspace {
    grid-template-columns: minmax(0, 1fr) minmax(22rem, 0.78fr);
  }
}

.tool-preview-sticky {
  position: sticky;
  top: 1rem;
  align-self: start;
}
</style>
