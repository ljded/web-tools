<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface HistoryItem {
  id: string
  timestamp: number
  label: string
  data?: unknown
}

const props = defineProps<{
  items: HistoryItem[]
  title?: string
}>()

const emit = defineEmits<{
  select: [item: any]
  remove: [id: string]
  clear: []
}>()

const open = ref(false)
const { t, locale } = useI18n()

// 全局时间格式化缓存
const timeFormatCache = new Map<string, string>()

// 定期清理缓存（避免内存泄漏）
let cacheCleanupTimer: ReturnType<typeof setInterval> | null = null
if (typeof window !== 'undefined') {
  cacheCleanupTimer = setInterval(() => {
    if (timeFormatCache.size > 1000) {
      timeFormatCache.clear()
    }
  }, 60000)
}

function formatTime(ts: number): string {
  // 生成缓存键（包含语言环境以支持多语言）
  const cacheKey = `${ts}-${locale.value}`

  if (timeFormatCache.has(cacheKey)) {
    return timeFormatCache.get(cacheKey)!
  }

  const d = new Date(ts)
  const diff = Date.now() - d.getTime()

  let formatted: string
  if (diff < 60_000) {
    formatted = t('app.justNow')
  } else if (diff < 3600_000) {
    formatted = t('app.minutesAgo', { n: Math.floor(diff / 60_000) })
  } else if (diff < 86400_000) {
    formatted = t('app.hoursAgo', { n: Math.floor(diff / 3600_000) })
  } else {
    formatted = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  timeFormatCache.set(cacheKey, formatted)
  return formatted
}

const displayTitle = computed(() => props.title || t('app.history'))

// 优化：缓存时间格式化结果
const itemsWithFormattedTime = computed(() =>
  props.items.map(item => ({
    ...item,
    formattedTime: formatTime(item.timestamp)
  }))
)

function onSelect(item: HistoryItem) {
  emit('select', item)
  open.value = false
}

// 清理缓存计时器
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (cacheCleanupTimer) {
      clearInterval(cacheCleanupTimer)
    }
  })
}

</script>

<template>
  <UPopover v-model:open="open" :content="{ align: 'end', sideOffset: 8 }">
    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-elevated"
      :class="open ? 'bg-elevated' : ''"
    >
      <UIcon name="i-lucide-history" class="size-3.5" />
      {{ t('app.history') }}
      <UBadge v-if="items.length" color="primary" variant="soft" size="xs">{{ items.length }}</UBadge>
    </UButton>

    <template #content>
      <div class="hig-surface w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-[1.35rem] border shadow-xl shadow-default/15">
        <div class="hig-divider flex items-center justify-between border-b px-3 py-2">
          <span class="text-xs font-medium text-muted">{{ displayTitle }}</span>
          <div class="flex items-center gap-1">
            <UButton
              v-if="items.length"
              color="error"
              variant="ghost"
              size="xs"
              class="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-error transition-colors hover:bg-error/5"
              @click="emit('clear')"
            >
              <UIcon name="i-lucide-trash2" class="size-3" />
              {{ t('app.clear') }}
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-x"
              class="rounded p-0.5 text-muted transition-colors hover:bg-elevated"
              @click="open = false"
            />
          </div>
        </div>

        <div v-if="!items.length" class="px-3 py-4 text-center text-xs text-muted">
          {{ t('app.noHistory') }}
        </div>

        <div v-else class="max-h-72 overflow-auto py-1">
          <div
            v-for="item in itemsWithFormattedTime"
            :key="item.id"
            class="flex w-full items-center gap-2 px-3 py-2 hover:bg-accented"
          >
            <UButton
              color="neutral"
              variant="ghost"
              class="min-w-0 flex-1 justify-start rounded-md p-0 text-left"
              @click="onSelect(item)"
            >
              <div class="truncate text-xs text-default">{{ item.label }}</div>
              <div class="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <UIcon name="i-lucide-clock" class="size-2.5" />
                {{ item.formattedTime }}
              </div>
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-x"
              class="shrink-0 rounded p-1 text-muted transition-colors hover:bg-error/10 hover:text-error"
              @click="emit('remove', item.id)"
            />
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
