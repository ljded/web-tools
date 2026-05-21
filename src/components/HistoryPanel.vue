<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { History, X, Trash2, Clock } from '@lucide/vue'

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
const { t } = useI18n()

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return t('app.justNow')
  if (diff < 3600_000) return t('app.minutesAgo', { n: Math.floor(diff / 60_000) })
  if (diff < 86400_000) return t('app.hoursAgo', { n: Math.floor(diff / 3600_000) })
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const displayTitle = computed(() => props.title || t('app.history'))

function onSelect(item: HistoryItem) {
  emit('select', item)
  open.value = false
}
</script>

<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-variant transition-colors"
      :class="open ? 'bg-surface-variant' : ''"
    >
      <History class="h-3.5 w-3.5" />
      {{ t('app.history') }}
      <span v-if="items.length" class="rounded-full bg-primary-container px-1.5 py-0 text-[10px] text-on-primary-container">{{ items.length }}</span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-outline bg-surface shadow-lg"
    >
      <div class="flex items-center justify-between border-b border-outline-variant px-3 py-2">
        <span class="text-xs font-medium text-on-surface-variant">{{ displayTitle }}</span>
        <div class="flex items-center gap-1">
          <button
            v-if="items.length"
            @click="emit('clear')"
            class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-error hover:bg-error-container/30 transition-colors"
          >
            <Trash2 class="h-3 w-3" />
            {{ t('app.clear') }}
          </button>
          <button
            @click="open = false"
            class="rounded p-0.5 text-on-surface-variant hover:bg-surface-variant transition-colors"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div v-if="!items.length" class="px-3 py-4 text-center text-xs text-on-surface-variant">
        {{ t('app.noHistory') }}
      </div>

      <div v-else class="max-h-64 overflow-auto py-1">
        <button
          v-for="item in items"
          :key="item.id"
          @click="onSelect(item)"
          class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-variant/50 transition-colors"
        >
          <div class="min-w-0 flex-1">
            <div class="truncate text-xs text-on-surface">{{ item.label }}</div>
            <div class="mt-0.5 flex items-center gap-1 text-[10px] text-on-surface-variant">
              <Clock class="h-2.5 w-2.5" />
              {{ formatTime(item.timestamp) }}
            </div>
          </div>
          <button
            @click.stop="emit('remove', item.id)"
            class="shrink-0 rounded p-1 text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
          >
            <X class="h-3 w-3" />
          </button>
        </button>
      </div>
    </div>
  </div>
</template>
