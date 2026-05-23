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
    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      @click="open = !open"
      class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:bg-elevated transition-colors"
      :class="open ? 'bg-elevated' : ''"
    >
      <UIcon name="i-lucide-history" class="size-3.5" />
      {{ t('app.history') }}
      <UBadge v-if="items.length" color="primary" variant="soft" size="xs">{{ items.length }}</UBadge>
    </UButton>

    <UCard
      v-if="open"
      variant="outline"
      :ui="{ root: 'absolute right-0 top-full z-50 mt-1 w-72 rounded-xl shadow-lg', body: 'p-0' }"
    >
      <div class="flex items-center justify-between border-b border-default px-3 py-2">
        <span class="text-xs font-medium text-muted">{{ displayTitle }}</span>
        <div class="flex items-center gap-1">
          <UButton
            v-if="items.length"
            color="error"
            variant="ghost"
            size="xs"
            @click="emit('clear')"
            class="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-error hover:bg-error/5 transition-colors"
          >
            <UIcon name="i-lucide-trash2" class="size-3" />
            {{ t('app.clear') }}
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            @click="open = false"
            class="rounded p-0.5 text-muted hover:bg-elevated transition-colors"
          >
            <UIcon name="i-lucide-x" class="size-3.5" />
          </UButton>
        </div>
      </div>

      <div v-if="!items.length" class="px-3 py-4 text-center text-xs text-muted">
        {{ t('app.noHistory') }}
      </div>

      <div v-else class="max-h-64 overflow-auto py-1">
        <div
          v-for="item in items"
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
              {{ formatTime(item.timestamp) }}
            </div>
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            @click="emit('remove', item.id)"
            class="shrink-0 rounded p-1 text-muted hover:text-error hover:bg-error/10 transition-colors"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
