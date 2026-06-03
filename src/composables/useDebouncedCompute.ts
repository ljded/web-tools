import { onUnmounted, ref, watch, type WatchSource } from 'vue'

export interface DebouncedComputeOptions {
  delay?: number
  immediate?: boolean
}

export function useLatestTask() {
  let generation = 0

  function next() {
    const current = ++generation
    return () => current === generation
  }

  function cancel() {
    generation++
  }

  onUnmounted(cancel)

  return { next, cancel }
}

/**
 * 支持 AbortController 的计算函数类型
 */
export type ComputeFn = (signal?: AbortSignal) => void | Promise<void>

export function useDebouncedCompute<T>(
  source: WatchSource<T>,
  compute: ComputeFn,
  options: DebouncedComputeOptions = {},
) {
  const { delay = 200, immediate = true } = options
  const isComputing = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  let generation = 0
  let currentAbortController: AbortController | null = null

  function trigger() {
    isComputing.value = true

    // 取消之前的操作
    if (currentAbortController) {
      currentAbortController.abort()
      currentAbortController = null
    }

    if (timer) clearTimeout(timer)
    const currentGen = ++generation

    timer = setTimeout(async () => {
      // 如果在这期间又有新触发，跳过过期计算
      if (currentGen !== generation) return

      // 创建新的 AbortController
      currentAbortController = new AbortController()
      const signal = currentAbortController.signal

      try {
        await compute(signal)
      } catch (error) {
        // 忽略 AbortError
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        // 其他错误继续抛出
        console.error('[useDebouncedCompute] Compute error:', error)
      } finally {
        // 同样检查：可能 compute 执行期间又有新触发
        if (currentGen === generation) {
          isComputing.value = false
          currentAbortController = null
        }
      }
    }, delay)
  }

  watch(source, trigger, { immediate })

  function cancel() {
    // 取消定时器
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    // 取消正在进行的异步操作
    if (currentAbortController) {
      currentAbortController.abort()
      currentAbortController = null
    }

    generation++ // 使进行中的 async 结果无效
    isComputing.value = false
  }

  onUnmounted(cancel)

  return {
    isComputing,
    trigger,
    cancel,
  }
}
