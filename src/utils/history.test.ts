import { describe, it, expect } from 'vitest'

// 直接导入测试纯函数
function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function defaultEquals<T>(a: T, b: T): boolean {
  if (a === b) return true
  if (a == null || b == null) return false

  const ta = typeof a
  const tb = typeof b
  if (ta !== tb) return false

  if (ta === 'string' || ta === 'number' || ta === 'boolean') {
    return a === b
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object)
    const keysB = Object.keys(b as object)
    if (keysA.length !== keysB.length) return false
    for (const key of keysA) {
      if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
        return false
      }
    }
    return true
  }

  return false
}

describe('history equals 默认策略', () => {
  it('基本类型比较', () => {
    expect(defaultEquals('abc', 'abc')).toBe(true)
    expect(defaultEquals('abc', 'def')).toBe(false)
    expect(defaultEquals(123, 123)).toBe(true)
    expect(defaultEquals(123, 456)).toBe(false)
    expect(defaultEquals(true, true)).toBe(true)
    expect(defaultEquals(true, false)).toBe(false)
  })

  it('null/undefined 处理', () => {
    expect(defaultEquals(null, null)).toBe(true)
    expect(defaultEquals(null, undefined)).toBe(false)
    expect(defaultEquals('a', null)).toBe(false)
  })

  it('Date 比较', () => {
    const d1 = new Date('2026-01-01')
    const d2 = new Date('2026-01-01')
    const d3 = new Date('2026-01-02')
    expect(defaultEquals(d1, d2)).toBe(true)
    expect(defaultEquals(d1, d3)).toBe(false)
  })

  it('对象浅比较', () => {
    expect(defaultEquals({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true)
    expect(defaultEquals({ a: 1, b: 'x' }, { a: 1, b: 'y' })).toBe(false)
    expect(defaultEquals({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })

  it('跨类型比较', () => {
    expect(defaultEquals('123', 123 as unknown as string)).toBe(false)
  })
})
