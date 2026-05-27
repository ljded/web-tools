<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  title: string
  description?: string
  icon?: string
}>()
</script>

<template>
  <section class="hig-panel relative overflow-hidden rounded-[2.25rem] border p-5 sm:p-6 lg:p-8">
    <div class="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
    <div class="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />
    <div class="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div class="flex min-w-0 items-start gap-4 sm:gap-5">
        <div
          v-if="icon"
          class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.35rem] bg-primary text-primary-contrast shadow-xl shadow-primary/25 ring-1 ring-inset ring-white/25 sm:h-16 sm:w-16"
        >
          <UIcon :name="icon" class="size-6 sm:size-7" />
        </div>
        <div class="min-w-0">
          <div class="mb-3 flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted">
            <span class="h-1.5 w-1.5 rounded-full bg-primary shadow-sm shadow-primary" />
            {{ t('app.toolWorkbench') }}
            <span class="hidden h-px w-8 bg-default sm:block" />
            <span class="normal-case tracking-normal text-dimmed">{{ t('app.localFirstUtility') }}</span>
          </div>
          <h1 class="text-balance text-3xl font-black tracking-tight text-highlighted sm:text-4xl">{{ title }}</h1>
          <p v-if="description" class="mt-3 max-w-3xl text-sm leading-6 text-muted sm:text-base">{{ description }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="hig-action-cluster shrink-0 lg:max-w-[42%]">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>
