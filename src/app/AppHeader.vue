<script setup lang="ts">
import { usePreferenceStore } from '@/stores/preference'

defineProps<{
  title: string
}>()

const emit = defineEmits<{
  openNavigation: []
  openSearch: []
}>()

const preference = usePreferenceStore()
const localeItems = [
  { label: '中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
]
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-default bg-default/85 px-4 backdrop-blur-xl"
  >
    <UButton
      icon="i-lucide-menu"
      color="neutral"
      variant="ghost"
      size="sm"
      class="rounded-full md:hidden"
      :ui="{ base: 'rounded-full' }"
      @click="emit('openNavigation')"
    />
    <h1 class="truncate text-base font-semibold text-highlighted">{{ title }}</h1>
    <div class="ml-auto flex items-center gap-2">
      <UButton
        icon="i-lucide-search"
        color="neutral"
        variant="ghost"
        size="sm"
        class="rounded-full"
        :ui="{ base: 'rounded-full' }"
        @click="emit('openSearch')"
      >
        <span class="hidden sm:inline">{{ $t('app.search') }}</span>
      </UButton>
      <UColorModeSelect color="neutral" variant="ghost" size="sm" class="w-32" />
      <div class="mx-1 h-5 w-px bg-default" />
      <USelect
        v-model="preference.locale"
        :items="localeItems"
        color="neutral"
        variant="ghost"
        size="sm"
        class="w-28"
      />
    </div>
  </header>
</template>
