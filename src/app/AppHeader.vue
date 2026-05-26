<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferenceStore } from '@/stores/preference'

defineProps<{
  title: string
}>()

const emit = defineEmits<{
  openNavigation: []
  openSearch: []
}>()

const preference = usePreferenceStore()
const { t } = useI18n()
const localeItems = computed(() => [
  { label: t('locale.zh'), value: 'zh-CN' },
  { label: t('locale.en'), value: 'en-US' },
])
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-default/55 bg-default/68 px-3 shadow-sm shadow-default/5 backdrop-blur-2xl sm:px-4 lg:h-[4.25rem]"
  >
    <UButton
      icon="i-lucide-menu"
      color="neutral"
      variant="ghost"
      size="sm"
      class="rounded-full md:hidden"
      :aria-label="$t('app.openNavigation')"
      :title="$t('app.openNavigation')"
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
        variant="soft"
        size="sm"
        class="rounded-full"
        :aria-label="$t('app.openSearch')"
        :title="$t('app.openSearch')"
        :ui="{ base: 'rounded-full border border-default/60 bg-elevated/70 px-3 focus-visible:hig-focus' }"
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
