import { describe, it, expect, beforeEach } from 'vitest'
import { usePersistedRef } from '../persist'

describe('usePersistedRef', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should initialize with default value', () => {
    const ref = usePersistedRef('test-key', 'default')
    expect(ref.value).toBe('default')
  })

  it('should persist string values', () => {
    const ref = usePersistedRef('test-key', 'initial')
    ref.value = 'updated'

    const ref2 = usePersistedRef('test-key', 'initial')
    expect(ref2.value).toBe('updated')
  })

  it('should persist number values', () => {
    const ref = usePersistedRef('test-number', 42)
    ref.value = 100

    const ref2 = usePersistedRef('test-number', 42)
    expect(ref2.value).toBe(100)
  })

  it('should persist object values', () => {
    const ref = usePersistedRef('test-object', { count: 0 })
    ref.value = { count: 5 }

    const ref2 = usePersistedRef('test-object', { count: 0 })
    expect(ref2.value).toEqual({ count: 5 })
  })

  it('should persist array values', () => {
    const ref = usePersistedRef('test-array', [1, 2, 3])
    ref.value = [4, 5, 6]

    const ref2 = usePersistedRef('test-array', [1, 2, 3])
    expect(ref2.value).toEqual([4, 5, 6])
  })

  it('should handle boolean values', () => {
    const ref = usePersistedRef('test-bool', false)
    ref.value = true

    const ref2 = usePersistedRef('test-bool', false)
    expect(ref2.value).toBe(true)
  })

  it('should return default value if localStorage fails', () => {
    // 模拟 localStorage 失败
    const originalGetItem = localStorage.getItem
    localStorage.getItem = () => { throw new Error('Storage error') }

    const ref = usePersistedRef('test-key', 'default')
    expect(ref.value).toBe('default')

    localStorage.getItem = originalGetItem
  })

  it('should handle null values', () => {
    const ref = usePersistedRef<string | null>('test-null', null)
    expect(ref.value).toBe(null)

    ref.value = 'not null'
    expect(ref.value).toBe('not null')

    ref.value = null
    expect(ref.value).toBe(null)
  })
})
