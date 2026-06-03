/**
 * 多 Tab 工具专用组件
 * 用于 PdfTool, ImageTool, Crypto 等多 tab 工具
 */

<script setup lang="ts">
import { computed, useSlots } from 'vue'

interface TabItem {
  label?: string
  value?: string
  icon?: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    /** 当前激活的 tab */
    modelValue: string
    /** Tab 选项 */
    tabs: Array<{
      value: string
      labelKey: string
      icon?: string
      disabled?: boolean
    }>
    /** Tab 颜色 */
    color?: string
    /** 是否紧凑模式 */
    compact?: boolean
  }>(),
  {
    color: 'primary',
    compact: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const tabItems = computed<TabItem[]>(() =>
  props.tabs.map(tab => ({
    label: tab.labelKey,
    value: tab.value,
    icon: tab.icon,
    disabled: tab.disabled,
  }))
)

const activeTab = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const slots = useSlots()
const hasActions = computed(() => !!slots.actions)
</script>

<template>
  <div class="tab-tool-section">
    <!-- Tab 切换栏 -->
    <div class="tab-tool-header" :class="{ compact }">
      <UTabs
        v-model="activeTab"
        :items="tabItems"
        :color="color"
        size="sm"
        class="flex-1"
      >
        <template #default="{ item }">
          <div class="flex items-center gap-2">
            <UIcon v-if="item.icon" :name="item.icon" class="size-4" />
            <span>{{ item.label ? $t(item.label) : '' }}</span>
          </div>
        </template>
      </UTabs>

      <!-- 操作按钮区 -->
      <div v-if="hasActions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <!-- Tab 内容区 -->
    <div class="tab-tool-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.tab-tool-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tab-tool-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--ui-bg-elevated);
  border-radius: 1.75rem;
  border: 1px solid var(--ui-border-default);
}

.tab-tool-header.compact {
  padding: 0.75rem;
}

.tab-tool-content {
  min-height: 0;
  flex: 1;
}
</style>
