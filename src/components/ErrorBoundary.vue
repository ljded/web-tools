<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const error = ref<unknown>(null)
const toast = useToast()

onErrorCaptured((err) => {
  error.value = err
  toast.add({
    title: err instanceof Error ? err.message : '工具页面运行异常',
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
    :ui="{ root: 'mx-auto max-w-2xl rounded-3xl shadow-sm', body: 'p-6' }"
  >
    <div class="flex items-start gap-4">
      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-error/10 text-error">
        <UIcon name="i-lucide-alert-triangle" class="size-5" />
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-lg font-semibold text-highlighted">工具页面发生异常</h2>
        <p class="mt-1 text-sm leading-6 text-muted">
          已拦截未处理错误，避免应用白屏。可以返回首页或重试当前页面。
        </p>
        <pre class="mt-3 max-h-40 overflow-auto rounded-xl bg-elevated p-3 text-xs text-muted">{{ error }}</pre>
        <UButton
          label="重试"
          icon="i-lucide-refresh-cw"
          color="primary"
          class="mt-4 rounded-full"
          @click="reset"
        />
      </div>
    </div>
  </UCard>
</template>
