import { ref, watch, type WatchSource } from 'vue'

export interface DebouncedComputeOptions {
  delay?: number
  immediate?: boolean
}

export function useDebouncedCompute<T>(
  source: WatchSource<T>,
  compute: () => void | Promise<void>,
  options: DebouncedComputeOptions = {},
) {
  const { delay = 200, immediate = true } = options
  const isComputing = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  let generation = 0

  function trigger() {
    isComputing.value = true
    if (timer) clearTimeout(timer)
    const currentGen = ++generation
    timer = setTimeout(async () => {
      // 如果在这期间又有新触发，跳过过期计算
      if (currentGen !== generation) return
      try {
        await compute()
      } finally {
        // 同样检查：可能 compute 执行期间又有新触发
        if (currentGen === generation) {
          isComputing.value = false
        }
      }
    }, delay)
  }

  watch(source, trigger, { immediate })

  function cancel() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    generation++ // 使进行中的 async 结果无效
    isComputing.value = false
  }

  return {
    isComputing,
    trigger,
    cancel,
  }
}
