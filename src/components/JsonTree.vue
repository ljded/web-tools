<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { copyToClipboard } from '@/utils/clipboard'

const props = withDefaults(
  defineProps<{
    data: unknown
    name?: string
    depth?: number
    maxDepth?: number
  }>(),
  {
    maxDepth: 50,
  }
)

const depth = props.depth ?? 0
const { t, locale } = useI18n()
const isOpen = ref(depth < 2)
const copied = ref(false)
const isOverMaxDepth = computed(() => depth >= props.maxDepth)

const type = computed(() => {
  if (props.data === null) return 'null'
  if (Array.isArray(props.data)) return 'array'
  return typeof props.data
})

const isComplex = computed(() => type.value === 'object' || type.value === 'array')

// 优化：缓存 childKeys 计算
const childKeysCache = new Map<unknown, string[]>()
const childKeys = computed(() => {
  if (!isComplex.value || isOverMaxDepth.value) return []

  // 检查缓存
  if (childKeysCache.has(props.data)) {
    return childKeysCache.get(props.data)!
  }

  let keys: string[]
  if (type.value === 'array') {
    const arr = props.data as unknown[]
    // 对于大数组，限制初始渲染数量
    const limit = arr.length > 1000 ? 100 : arr.length
    keys = Array.from({ length: limit }, (_, i) => String(i))
  } else {
    keys = Object.keys(props.data as Record<string, unknown>)
    // 对于大对象，限制初始渲染数量
    if (keys.length > 1000) {
      keys = keys.slice(0, 100)
    }
  }

  childKeysCache.set(props.data, keys)
  return keys
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
  if (/^\d{10}(\d{3})?$/.test(raw)) {
    const ms = raw.length === 10 ? num * 1000 : num
    const date = new Date(ms)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString(locale.value)
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
  if (t === 'string') return 'text-success'
  if (t === 'number' || t === 'bigint') return 'text-info'
  if (t === 'boolean') return 'text-primary font-medium'
  if (t === 'null') return 'text-muted font-medium'
  return 'text-default'
}

// 清理缓存（避免内存泄漏）
if (depth === 0) {
  const interval = setInterval(() => {
    if (childKeysCache.size > 500) {
      childKeysCache.clear()
    }
  }, 30000)

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => clearInterval(interval))
  }
}

</script>

<template>
  <div class="font-mono text-xs leading-5">
    <div
      class="group flex items-start gap-1 rounded px-1 hover:bg-elevated"
      :style="{ paddingLeft: depth * 12 + 'px' }"
    >
      <UButton
        v-if="isComplex"
        color="neutral"
        variant="ghost"
        size="xs"
        :icon="isOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
        class="mt-0.5 size-4 shrink-0 p-0 text-muted"
        @click="toggle"
      />
      <span v-else class="w-3.5 shrink-0" />

      <span v-if="name !== undefined" class="shrink-0 text-primary">{{
        JSON.stringify(name)
      }}</span>
      <span v-if="name !== undefined" class="text-muted">:</span>

      <span v-if="!isComplex" :class="valueClass()">{{ JSON.stringify(data) }}</span>
      <UBadge
        v-if="timestampInfo"
        color="primary"
        variant="soft"
        size="xs"
        class="ml-2 font-sans"
      >
        {{ timestampInfo }}
      </UBadge>
      <span v-else-if="isComplex && !isOpen" class="cursor-pointer text-muted" @click="toggle">{{
        preview
      }}</span>
      <span v-else-if="isOverMaxDepth" class="text-muted">
        {{ t('app.maxDepthReached', { depth: maxDepth }) }}
      </span>

      <UButton
        @click="copyValue"
        color="neutral"
        variant="ghost"
        size="xs"
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        class="ml-auto size-4 shrink-0 p-0 opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
        :class="copied ? 'text-primary opacity-100' : 'text-muted'"
        :title="t('app.copy')"
      />
    </div>

    <div v-if="isComplex && isOpen && !isOverMaxDepth">
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
        :max-depth="maxDepth"
      />
      <div :style="{ paddingLeft: depth * 12 + 'px' }" class="text-muted">
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
