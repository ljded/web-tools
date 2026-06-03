import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useDebouncedCompute } from '../useDebouncedCompute'

// Helper to test composables in a component context
function withSetup<T>(composable: () => T) {
  let result: T
  const wrapper = mount(
    defineComponent({
      setup() {
        result = composable()
        return () => {}
      },
    })
  )
  return { result: result!, wrapper }
}

describe('useDebouncedCompute', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('应在输入变化后延迟执行计算', async () => {
    const computeFn = vi.fn()

    const { result } = withSetup(() => {
      const input = ref('initial')
      return useDebouncedCompute(input, computeFn, { delay: 220 })
    })

    result.trigger()

    // 立即检查，函数不应执行
    expect(computeFn).not.toHaveBeenCalled()

    // 快进时间
    vi.advanceTimersByTime(220)

    // 现在应该执行了
    expect(computeFn).toHaveBeenCalledTimes(1)
  })

  it('应提供 isComputing 状态', () => {
    const computeFn = vi.fn()

    const { result } = withSetup(() => {
      const input = ref('test')
      return useDebouncedCompute(input, computeFn, { delay: 100 })
    })

    // 初始应为 false
    expect(typeof result.isComputing.value).toBe('boolean')
  })

  it('应支持取消防抖计算', () => {
    const computeFn = vi.fn()

    const { result } = withSetup(() => {
      const input = ref('test')
      return useDebouncedCompute(input, computeFn, { delay: 220 })
    })

    result.trigger()
    result.cancel()

    vi.advanceTimersByTime(220)

    // 取消后不应执行
    expect(computeFn).not.toHaveBeenCalled()
  })

  it('应在新触发时取消之前的计算', () => {
    const computeFn = vi.fn()

    const { result } = withSetup(() => {
      const input = ref('test')
      return useDebouncedCompute(input, computeFn, { delay: 220 })
    })

    // 第一次触发
    result.trigger()
    vi.advanceTimersByTime(100)

    // 第二次触发（应取消第一次）
    result.trigger()
    vi.advanceTimersByTime(220)

    // 只应执行一次
    expect(computeFn).toHaveBeenCalledTimes(1)
  })

  it('应支持自定义延迟', () => {
    const computeFn = vi.fn()

    const { result } = withSetup(() => {
      const input = ref('test')
      return useDebouncedCompute(input, computeFn, { delay: 500 })
    })

    result.trigger()

    vi.advanceTimersByTime(499)
    expect(computeFn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(computeFn).toHaveBeenCalledTimes(1)
  })

  it('应支持多次触发', () => {
    const computeFn = vi.fn()

    const { result } = withSetup(() => {
      const input = ref('test')
      return useDebouncedCompute(input, computeFn, { delay: 100 })
    })

    // 第一次
    result.trigger()
    vi.advanceTimersByTime(100)
    expect(computeFn).toHaveBeenCalledTimes(1)

    // 第二次
    result.trigger()
    vi.advanceTimersByTime(100)
    expect(computeFn).toHaveBeenCalledTimes(2)

    // 第三次
    result.trigger()
    vi.advanceTimersByTime(100)
    expect(computeFn).toHaveBeenCalledTimes(3)
  })
})
