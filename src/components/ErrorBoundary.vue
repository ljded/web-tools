<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'
import { AlertTriangle, RefreshCw } from '@lucide/vue'
import { useSnackbarStore } from '@/stores/snackbar'

const error = ref<unknown>(null)
const snackbar = useSnackbarStore()

onErrorCaptured((err) => {
  error.value = err
  snackbar.open(err instanceof Error ? err.message : '工具页面运行异常', 'error')
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
    class="mx-auto max-w-2xl rounded-3xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant"
  >
    <div class="flex items-start gap-4">
      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-error-container text-on-error-container">
        <AlertTriangle class="h-5 w-5" />
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-lg font-semibold text-on-surface">工具页面发生异常</h2>
        <p class="mt-1 text-sm leading-6 text-on-surface-variant">
          已拦截未处理错误，避免应用白屏。可以返回首页或重试当前页面。
        </p>
        <pre class="mt-3 max-h-40 overflow-auto rounded-xl bg-surface-variant/50 p-3 text-xs text-on-surface-variant">{{ error }}</pre>
        <UButton
          type="button"
          color="primary"
          class="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-sm transition-colors hover:bg-primary/90"
          @click="reset"
        >
          <RefreshCw class="h-4 w-4" />
          重试
        </UButton>
      </div>
    </div>
  </UCard>
</template>
