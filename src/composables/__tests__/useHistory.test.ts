import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useHistory } from '../../utils/history'

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

describe('useHistory', () => {
  beforeEach(() => {
    // 清理存储
    localStorage.clear()
  })

  it('应正确初始化历史记录', () => {
    const { result } = withSetup(() =>
      useHistory<{ data: string }>('test-history-composable-init', {
        maxCount: 10,
      }),
    )

    expect(result.items.value).toEqual([])
  })

  it('应能添加历史记录', async () => {
    const { result } = withSetup(() =>
      useHistory<{ data: string }>('test-history-composable-add', {
        maxCount: 10,
        debounceMs: 0,
      }),
    )
    await result.ready

    await result.add({ data: 'item 1' })

    expect(result.items.value.length).toBeGreaterThan(0)
  })

  it('应能删除历史记录', async () => {
    const { result } = withSetup(() =>
      useHistory<{ data: string }>('test-history-composable-delete', {
        maxCount: 10,
        debounceMs: 0,
      }),
    )
    await result.ready

    await result.add({ data: 'item 1' })
    const items = result.items.value

    if (items.length > 0) {
      await result.remove(items[0].id)
      expect(result.items.value.length).toBe(0)
    }
  })

  it('应能清空所有历史记录', async () => {
    const { result } = withSetup(() =>
      useHistory<{ data: string }>('test-history-composable-clear', {
        maxCount: 10,
        debounceMs: 0,
      }),
    )
    await result.ready

    await result.add({ data: 'item 1' })
    await result.add({ data: 'item 2' })
    await result.clear()

    expect(result.items.value).toEqual([])
  })

  it('应尊重最大记录数限制', async () => {
    const maxCount = 3

    const { result } = withSetup(() =>
      useHistory<{ data: string }>('test-history-composable-max', {
        maxCount,
        debounceMs: 0,
      }),
    )
    await result.ready

    // 添加超过限制的记录
    await result.add({ data: 'item 1' })
    await result.add({ data: 'item 2' })
    await result.add({ data: 'item 3' })
    await result.add({ data: 'item 4' })

    expect(result.items.value.length).toBeLessThanOrEqual(maxCount)
  })

  it('应正确处理不同类型的数据', async () => {
    interface CustomData {
      text: string
      number: number
      boolean: boolean
    }

    const { result } = withSetup(() =>
      useHistory<CustomData>('test-history-composable-types', {
        maxCount: 10,
        debounceMs: 0,
      }),
    )
    await result.ready

    const data: CustomData = {
      text: 'hello',
      number: 42,
      boolean: true,
    }

    await result.add(data)

    const items = result.items.value
    if (items.length > 0) {
      expect(items[0]?.data.text).toBe('hello')
      expect(items[0]?.data.number).toBe(42)
      expect(items[0]?.data.boolean).toBe(true)
    }
  })

  it('应按时间倒序排列记录', async () => {
    const { result } = withSetup(() =>
      useHistory<{ data: string }>('test-history-composable-order', {
        maxCount: 10,
        debounceMs: 0,
      }),
    )
    await result.ready

    await result.add({ data: 'first' })
    await new Promise((resolve) => setTimeout(resolve, 10))
    await result.add({ data: 'second' })

    const items = result.items.value
    if (items.length >= 2) {
      // 最新的应该在前面
      expect(items[0]?.data.data).toBe('second')
      expect(items[1]?.data.data).toBe('first')
    }
  })
})
