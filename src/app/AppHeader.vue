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
    class="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-default/70 bg-default/75 px-4 shadow-sm shadow-default/5 backdrop-blur-xl"
  >
    <UButton
      icon="i-lucide-menu"
      color="neutral"
      variant="ghost"
      size="sm"
      class="rounded-full md:hidden"
      :ui="{ base: 'rounded-full focus-visible:hig-focus' }"
      @click="emit('openNavigation')"
    />
    <div class="min-w-0">
      <h1 class="truncate text-base font-semibold tracking-tight text-highlighted">{{ title }}</h1>
      <p class="hidden text-xs text-muted sm:block">{{ $t('app.headerSubtitle') }}</p>
    </div>
    <div class="ml-auto flex items-center gap-2">
      <UButton
        icon="i-lucide-search"
        color="neutral"
        variant="ghost"
        size="sm"
        class="rounded-full"
        :ui="{ base: 'rounded-full focus-visible:hig-focus' }"
        @click="emit('openSearch')"
      >
        <span class="hidden sm:inline">{{ $t('app.search') }}</span>
        <UKbd value="meta" class="hidden lg:inline-flex" />
        <UKbd value="K" class="hidden lg:inline-flex" />
      </UButton>
      <UColorModeSelect color="neutral" variant="soft" size="sm" class="hidden w-32 sm:block" :ui="{ base: 'focus-visible:hig-focus' }" />
      <div class="mx-1 hidden h-5 w-px bg-default sm:block" />
      <USelect
        v-model="preference.locale"
        :items="localeItems"
        color="neutral"
        variant="soft"
        size="sm"
        class="hidden w-28 sm:block"
        :ui="{ base: 'focus-visible:hig-focus' }"
      />
    </div>
  </header>
</template>
