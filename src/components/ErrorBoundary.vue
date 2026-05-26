<script setup lang="ts">
import { computed, onErrorCaptured, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const error = ref<unknown>(null)
const toast = useToast()
const errorText = computed(() => {
  if (!error.value) return ''
  return error.value instanceof Error ? error.value.message : String(error.value)
})

onErrorCaptured((err) => {
  error.value = err
  toast.add({
    title: err instanceof Error ? err.message : t('app.toolRuntimeErrorTitle'),
    color: 'error',
    duration: 5000,
  })
  return false
})

function reset() {
  error.value = null
}
</script>

<template>
  <slot v-if="!error" />
  <UCard
    v-else
    variant="outline"
    :ui="{ root: 'hig-surface mx-auto max-w-2xl rounded-[1.75rem] border shadow-sm', body: 'p-6' }"
  >
    <div class="flex items-start gap-4">
      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-error/10 text-error">
        <UIcon name="i-lucide-alert-triangle" class="size-5" />
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-lg font-semibold text-highlighted">{{ t('app.toolRuntimeErrorTitle') }}</h2>
        <p class="mt-1 text-sm leading-6 text-muted">
          {{ t('app.toolRuntimeErrorDesc') }}
        </p>
        <pre class="mt-3 max-h-40 overflow-auto rounded-xl bg-elevated p-3 text-xs text-muted">{{ errorText }}</pre>
        <UButton
          :label="t('app.retry')"
          icon="i-lucide-refresh-cw"
          color="primary"
          class="mt-4 rounded-full"
          @click="reset"
        />
      </div>
    </div>
  </UCard>
</template>
