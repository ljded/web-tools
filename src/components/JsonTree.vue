<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronRight, ChevronDown, Copy, Check } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'

const props = defineProps<{
  data: unknown
  name?: string
  depth?: number
}>()

const depth = props.depth ?? 0
const isOpen = ref(depth < 2)
const copied = ref(false)

const type = computed(() => {
  if (props.data === null) return 'null'
  if (Array.isArray(props.data)) return 'array'
  return typeof props.data
})

const isComplex = computed(() => type.value === 'object' || type.value === 'array')

const childKeys = computed(() => {
  if (!isComplex.value) return []
  if (type.value === 'array') {
    return (props.data as unknown[]).map((_, i) => String(i))
  }
  return Object.keys(props.data as Record<string, unknown>)
})

const preview = computed(() => {
  if (type.value === 'array') {
    const arr = props.data as unknown[]
    return `Array(${arr.length})`
  }
  if (type.value === 'object') {
    const keys = Object.keys(props.data as Record<string, unknown>)
    return `{${keys.length} key${keys.length !== 1 ? 's' : ''}}`
  }
  return String(props.data)
})

const timestampInfo = computed(() => {
  if (type.value !== 'number' && type.value !== 'string') return ''

  const raw = String(props.data).trim()
  const num = Number(raw)
  if (!Number.isFinite(num) || num <= 0) return ''

  // 秒级 10 位、毫秒级 13 位时间戳。
  if (/^\d{10}(\d{3})?$/.test(raw)) {
    const ms = raw.length === 10 ? num * 1000 : num
    const date = new Date(ms)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString('zh-CN')
  }
  return ''
})

function toggle() {
  if (isComplex.value) isOpen.value = !isOpen.value
}

async function copyValue() {
  const text = JSON.stringify(props.data)
  const ok = await copyToClipboard(text)
  if (!ok) return
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function valueClass(): string {
  const t = type.value
  if (t === 'string') return 'text-green-600 dark:text-green-400'
  if (t === 'number' || t === 'bigint') return 'text-blue-600 dark:text-blue-400'
  if (t === 'boolean') return 'text-tertiary font-medium'
  if (t === 'null') return 'text-tertiary font-medium'
  return 'text-on-surface'
}
</script>

<template>
  <div class="font-mono text-xs leading-5">
    <div
      class="group flex items-start gap-1 rounded px-1 hover:bg-surface-variant/40"
      :style="{ paddingLeft: depth * 12 + 'px' }"
    >
      <button v-if="isComplex" @click="toggle" class="mt-0.5 shrink-0 text-on-surface-variant">
        <ChevronDown v-if="isOpen" class="h-3.5 w-3.5" />
        <ChevronRight v-else class="h-3.5 w-3.5" />
      </button>
      <span v-else class="w-3.5 shrink-0" />

      <span v-if="name !== undefined" class="shrink-0 text-primary">{{
        JSON.stringify(name)
      }}</span>
      <span v-if="name !== undefined" class="text-on-surface-variant">:</span>

      <span v-if="!isComplex" :class="valueClass()">{{ JSON.stringify(data) }}</span>
      <span
        v-if="timestampInfo"
        class="ml-2 rounded bg-primary-container px-1.5 py-0.5 font-sans text-[10px] text-on-primary-container"
      >
        {{ timestampInfo }}
      </span>
      <span v-else-if="isComplex && !isOpen" class="cursor-pointer text-on-surface-variant" @click="toggle">{{
        preview
      }}</span>

      <button
        @click="copyValue"
        class="ml-auto shrink-0 opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
        :class="copied ? 'text-primary opacity-100' : 'text-on-surface-variant'"
        title="复制"
      >
        <Check v-if="copied" class="h-3 w-3" />
        <Copy v-else class="h-3 w-3" />
      </button>
    </div>

    <div v-if="isComplex && isOpen">
      <JsonTree
        v-for="key in childKeys"
        :key="key"
        :name="type === 'array' ? undefined : key"
        :data="
          type === 'array'
            ? (data as unknown[])[Number(key)]
            : (data as Record<string, unknown>)[key]
        "
        :depth="depth + 1"
      />
      <div :style="{ paddingLeft: depth * 12 + 'px' }" class="text-on-surface-variant">
        {{ type === 'array' ? ']' : '}' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.group:hover .opacity-0 {
  opacity: 1;
}
</style>
