/**
 * 深度比较两个值是否相等
 * 用于替代 JSON.stringify 比较，性能更好
 */
export function deepEqual(a: any, b: any, maxDepth = 10): boolean {
  // 深度限制，防止栈溢出
  if (maxDepth === 0) return a === b

  // 严格相等或都是 null/undefined
  if (a === b) return true
  if (a == null || b == null) return false

  // 类型不同
  if (typeof a !== typeof b) return false

  // 非对象类型
  if (typeof a !== 'object') return a === b

  // 日期类型
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  // 正则表达式
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString()
  }

  // 数组类型
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], maxDepth - 1)) return false
    }
    return true
  }

  // 对象类型
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false
    if (!deepEqual(a[key], b[key], maxDepth - 1)) return false
  }

  return true
}

/**
 * 浅比较两个值是否相等
 * 用于性能敏感场景
 */
export function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return a === b

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false
    if (a[key] !== b[key]) return false
  }

  return true
}
