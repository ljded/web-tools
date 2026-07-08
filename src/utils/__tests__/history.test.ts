import { describe, it, expect, beforeEach } from 'vitest'
import { useHistory } from '../history'

describe('useHistory', () => {
  beforeEach(() => {
    // 清理 localStorage
    localStorage.clear()
  })

  it('should initialize with empty items', () => {
    const history = useHistory<{ value: string }>('test-history-init')
    expect(history.items.value).toEqual([])
  })

  it('should add items to history', async () => {
    const history = useHistory<{ value: string }>('test-history-add', { debounceMs: 0 })
    await history.ready

    await history.add({ value: 'test1' })
    expect(history.items.value).toHaveLength(1)
    expect(history.items.value[0]?.data.value).toBe('test1')
  })

  it('should generate labels for items', async () => {
    const history = useHistory<{ value: string }>('test-history-label', {
      debounceMs: 0,
      generateLabel: (data) => `Label: ${data.value}`,
    })
    await history.ready

    await history.add({ value: 'test1' })
    expect(history.items.value[0]?.label).toBe('Label: test1')
  })

  it('should limit history to maxCount', async () => {
    const history = useHistory<{ value: string }>('test-history-limit', {
      maxCount: 3,
      debounceMs: 0,
    })
    await history.ready

    await history.add({ value: 'test1' })
    await history.add({ value: 'test2' })
    await history.add({ value: 'test3' })
    await history.add({ value: 'test4' })

    expect(history.items.value).toHaveLength(3)
    expect(history.items.value[0]?.data.value).toBe('test4')
  })

  it('should move duplicate to front', async () => {
    const history = useHistory<{ value: string }>('test-history-duplicate', { debounceMs: 0 })
    await history.ready

    await history.add({ value: 'test1' })
    await history.add({ value: 'test2' })
    await history.add({ value: 'test1' })

    expect(history.items.value).toHaveLength(2)
    expect(history.items.value[0]?.data.value).toBe('test1')
    expect(history.items.value[1]?.data.value).toBe('test2')
  })

  it('should remove items by id', async () => {
    const history = useHistory<{ value: string }>('test-history-remove', { debounceMs: 0 })
    await history.ready

    await history.add({ value: 'test1' })
    await history.add({ value: 'test2' })

    const idToRemove = history.items.value[0]!.id
    await history.remove(idToRemove)

    expect(history.items.value).toHaveLength(1)
    expect(history.items.value[0]?.data.value).toBe('test1')
  })

  it('should clear all items', () => {
    const history = useHistory<{ value: string }>('test-history-clear', { debounceMs: 0 })

    history.add({ value: 'test1' })
    history.add({ value: 'test2' })
    history.clear()

    expect(history.items.value).toEqual([])
  })

  it('should persist to IndexedDB', async () => {
    const history = useHistory<{ value: string }>('test-history-persist', { debounceMs: 0 })
    await history.ready
    await history.add({ value: 'test1' })
    await history.flush()

    // 创建新实例，应该加载之前的数据
    const history2 = useHistory<{ value: string }>('test-history-persist', { debounceMs: 0 })
    await history2.ready
    expect(history2.items.value).toHaveLength(1)
    expect(history2.items.value[0]?.data.value).toBe('test1')
  })
})
