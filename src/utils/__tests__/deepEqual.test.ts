import { describe, it, expect } from 'vitest'
import { deepEqual } from '../deepEqual'

describe('deepEqual', () => {
  it('should return true for primitive equal values', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual('test', 'test')).toBe(true)
    expect(deepEqual(true, true)).toBe(true)
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(undefined, undefined)).toBe(true)
  })

  it('should return false for primitive unequal values', () => {
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('test', 'test2')).toBe(false)
    expect(deepEqual(true, false)).toBe(false)
    expect(deepEqual(null, undefined)).toBe(false)
  })

  it('should handle arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
    expect(deepEqual([1, 2, 3], [1, 2])).toBe(false)
    expect(deepEqual([], [])).toBe(true)
  })

  it('should handle nested arrays', () => {
    expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true)
    expect(deepEqual([1, [2, 3]], [1, [2, 4]])).toBe(false)
  })

  it('should handle objects', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(deepEqual({}, {})).toBe(true)
  })

  it('should handle nested objects', () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
  })

  it('should handle mixed nested structures', () => {
    const obj1 = { a: [1, { b: 2 }], c: 3 }
    const obj2 = { a: [1, { b: 2 }], c: 3 }
    const obj3 = { a: [1, { b: 3 }], c: 3 }

    expect(deepEqual(obj1, obj2)).toBe(true)
    expect(deepEqual(obj1, obj3)).toBe(false)
  })

  it('should handle different types', () => {
    expect(deepEqual(1, '1')).toBe(false)
    expect(deepEqual([], {})).toBe(false)
    expect(deepEqual(null, {})).toBe(false)
    expect(deepEqual(undefined, null)).toBe(false)
  })

  it('should handle Date objects', () => {
    const date1 = new Date('2024-01-01')
    const date2 = new Date('2024-01-01')
    const date3 = new Date('2024-01-02')

    expect(deepEqual(date1, date2)).toBe(true)
    expect(deepEqual(date1, date3)).toBe(false)
  })

  it('should handle circular references', () => {
    const obj1: any = { a: 1 }
    obj1.self = obj1

    const obj2: any = { a: 1 }
    obj2.self = obj2

    expect(deepEqual(obj1, obj2)).toBe(true)
  })
})
