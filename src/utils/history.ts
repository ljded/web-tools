import { shallowRef } from 'vue'
import {
  clearHistoryRecords,
  deleteHistoryRecord,
  getHistoryRecords,
  putHistoryRecords,
} from './db'

export interface HistoryItem<T> {
  id: string
  timestamp: number
  data: T
  label: string
}

export interface UseHistoryOptions<T> {
  maxCount?: number
  debounceMs?: number
  generateLabel?: (data: T) => string
  /** 自定义相等比较；默认使用结构化浅比较 */
  equals?: (a: T, b: T) => boolean
}

/**
 * 默认相等策略：
 * - 对 string / number / boolean 直接值比较
 * - 对 Date 比较 getTime()
 * - 其余回退到 JSON.stringify 全量比较
 */
function defaultEquals<T>(a: T, b: T): boolean {
  if (a === b) return true
  if (a == null || b == null) return false

  const ta = typeof a
  const tb = typeof b
  if (ta !== tb) return false

  // 基本类型不同值
  if (ta === 'string' || ta === 'number' || ta === 'boolean') {
    return a === b
  }

  // Date 比较
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  // 对象：浅比较第一层键值（避免对 File/Blob/ArrayBuffer 做 JSON.stringify）
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

export function useHistory<T extends Record<string, unknown>>(
  key: string,
  options: UseHistoryOptions<T> = {},
) {
  const { maxCount = 20, debounceMs = 1000, generateLabel, equals } = options

  const items = shallowRef<HistoryItem<T>[]>([])

  load()

  async function load() {
    try {
      const records = await getHistoryRecords<T>(key)
      if (records.length) {
        items.value = records.map(({ id, timestamp, data, label }) => ({
          id,
          timestamp,
          data,
          label,
        }))
        return
      }

      const legacy = localStorage.getItem(key)
      if (!legacy) return
      const parsed = JSON.parse(legacy) as HistoryItem<T>[]
      items.value = parsed
      await save()
      localStorage.removeItem(key)
    } catch {
      items.value = []
    }
  }

  function save() {
    return putHistoryRecords(key, items.value).catch(() => undefined)
  }

  let addTimer: ReturnType<typeof setTimeout> | null = null
  let pendingData: T | null = null

  function add(data: T) {
    pendingData = data
    if (addTimer) clearTimeout(addTimer)
    addTimer = setTimeout(() => {
      if (pendingData === null) return
      doAdd(pendingData)
      pendingData = null
    }, debounceMs)
  }

  function doAdd(data: T) {
    const label = generateLabel
      ? generateLabel(data)
      : JSON.stringify(data).slice(0, 60)

    const cmp = equals ?? defaultEquals

    const duplicateIndex = items.value.findIndex((item) => cmp(item.data, data))

    if (duplicateIndex !== -1) {
      const item = items.value[duplicateIndex]!
      item.timestamp = Date.now()
      item.label = label
      items.value.splice(duplicateIndex, 1)
      items.value.unshift(item)
    } else {
      items.value.unshift({
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        data,
        label,
      })
      if (items.value.length > maxCount) {
        items.value = items.value.slice(0, maxCount)
      }
    }

    save()
  }

  function remove(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
    deleteHistoryRecord(key, id).catch(() => undefined)
  }

  function clear() {
    items.value = []
    clearHistoryRecords(key).catch(() => undefined)
  }

  return {
    items,
    add,
    remove,
    clear,
  }
}
