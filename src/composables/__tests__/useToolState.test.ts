import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useToolState } from '../useToolState'

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

describe('useToolState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('应正确初始化输入状态', () => {
    const { result } = withSetup(() =>
      useToolState({
        storageKey: 'test-tool',
        defaultInput: 'hello world',
        getHistoryData: (v) => ({ data: v }),
      })
    )

    expect(result.input.value).toBe('hello world')
  })

  it('应能更新输入状态', async () => {
    const { result } = withSetup(() =>
      useToolState({
        storageKey: 'test-tool',
        defaultInput: '',
        getHistoryData: (v) => ({ data: v }),
      })
    )

    result.input.value = 'new value'
    await nextTick()
    expect(result.input.value).toBe('new value')
  })

  it('应正确管理错误状态', () => {
    const { result } = withSetup(() =>
      useToolState({
        storageKey: 'test-tool',
        defaultInput: '',
        getHistoryData: (v) => ({ data: v }),
      })
    )

    expect(result.error.value).toBe('')

    result.error.value = 'Test error'
    expect(result.error.value).toBe('Test error')
  })

  it('应正确管理处理状态', () => {
    const { result } = withSetup(() =>
      useToolState({
        storageKey: 'test-tool',
        defaultInput: '',
        getHistoryData: (v) => ({ data: v }),
      })
    )

    expect(result.isProcessing.value).toBe(false)

    result.isProcessing.value = true
    expect(result.isProcessing.value).toBe(true)
  })

  it('应提供历史记录功能', () => {
    const { result } = withSetup(() =>
      useToolState({
        storageKey: 'test-tool',
        defaultInput: '',
        getHistoryData: (v) => ({ data: v }),
      })
    )

    expect(result.history).toBeDefined()
    expect(result.history.items).toBeDefined()
  })

  it('应正确处理不同类型的输入', async () => {
    interface CustomInput {
      text: string
      options: { enabled: boolean }
    }

    const { result } = withSetup(() =>
      useToolState<CustomInput, { data: CustomInput }>({
        storageKey: 'test-custom',
        defaultInput: { text: 'hello', options: { enabled: true } },
        getHistoryData: (v) => ({ data: v }),
      })
    )

    expect(result.input.value.text).toBe('hello')
    expect(result.input.value.options.enabled).toBe(true)

    result.input.value = { text: 'world', options: { enabled: false } }
    await nextTick()
    expect(result.input.value.text).toBe('world')
    expect(result.input.value.options.enabled).toBe(false)
  })
})
