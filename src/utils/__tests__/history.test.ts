import { describe, it, expect, beforeEach } from 'vitest'
import { useHistory } from '../history'

describe('useHistory', () => {
  beforeEach(() => {
    // 清理 localStorage
    localStorage.clear()
  })

  it('should initialize with empty items', () => {
    const history = useHistory<{ value: string }>('test-history')
    expect(history.items.value).toEqual([])
  })

  it('should add items to history', () => {
    const history = useHistory<{ value: string }>('test-history')

    history.add({ value: 'test1' })
    expect(history.items.value).toHaveLength(1)
    expect(history.items.value[0]?.data.value).toBe('test1')
  })

  it('should generate labels for items', () => {
    const history = useHistory<{ value: string }>('test-history', {
      generateLabel: (data) => `Label: ${data.value}`,
    })

    history.add({ value: 'test1' })
    expect(history.items.value[0]?.label).toBe('Label: test1')
  })

  it('should limit history to maxCount', () => {
    const history = useHistory<{ value: string }>('test-history', {
      maxCount: 3,
    })

    history.add({ value: 'test1' })
    history.add({ value: 'test2' })
    history.add({ value: 'test3' })
    history.add({ value: 'test4' })

    expect(history.items.value).toHaveLength(3)
    expect(history.items.value[0]?.data.value).toBe('test4')
  })

  it('should move duplicate to front', () => {
    const history = useHistory<{ value: string }>('test-history')

    history.add({ value: 'test1' })
    history.add({ value: 'test2' })
    history.add({ value: 'test1' })

    expect(history.items.value).toHaveLength(2)
    expect(history.items.value[0]?.data.value).toBe('test1')
    expect(history.items.value[1]?.data.value).toBe('test2')
  })

  it('should remove items by id', () => {
    const history = useHistory<{ value: string }>('test-history')

    history.add({ value: 'test1' })
    history.add({ value: 'test2' })

    const idToRemove = history.items.value[0]!.id
    history.remove(idToRemove)

    expect(history.items.value).toHaveLength(1)
    expect(history.items.value[0]?.data.value).toBe('test2')
  })

  it('should clear all items', () => {
    const history = useHistory<{ value: string }>('test-history')

    history.add({ value: 'test1' })
    history.add({ value: 'test2' })
    history.clear()

    expect(history.items.value).toEqual([])
  })

  it('should persist to localStorage', () => {
    const history = useHistory<{ value: string }>('test-history')
    history.add({ value: 'test1' })

    // 创建新实例，应该加载之前的数据
    const history2 = useHistory<{ value: string }>('test-history')
    expect(history2.items.value).toHaveLength(1)
    expect(history2.items.value[0]?.data.value).toBe('test1')
  })
})
