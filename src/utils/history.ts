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

export function useHistory<T extends Record<string, unknown>>(
  key: string,
  options: UseHistoryOptions<T> = {},
) {
  const { maxCount = 20, debounceMs = 1000, generateLabel, equals } = options

  const items = shallowRef<HistoryItem<T>[]>([])

  let loaded = false

  async function loadFromDB() {
    try {
      const records = await getHistoryRecords<T>(key)
      if (records.length) {
        items.value = records.map(({ id, timestamp, data, label }) => ({
          id,
          timestamp,
          data,
          label,
        }))
        loaded = true
        return
      }

      const legacy = localStorage.getItem(key)
      if (legacy) {
        const parsed = JSON.parse(legacy) as HistoryItem<T>[]
        items.value = parsed
        await save()
        localStorage.removeItem(key)
      }
    } catch (e) {
      console.error('[web-tools] history load error', key, e)
      if (!loaded) items.value = []
    }
    loaded = true
  }
  loadFromDB()

  function formatUUID(): string {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
      }
    } catch { /* fall through */ }
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`
  }

  function save() {
    return putHistoryRecords(key, items.value).catch((e) => {
      console.error('[web-tools] history save error', key, e)
    })
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
    const arr = [...items.value]
    const duplicateIndex = arr.findIndex((item) => cmp(item.data, data))
    const now = Date.now()

    if (duplicateIndex !== -1) {
      const item = { ...arr[duplicateIndex]!, timestamp: now, label }
      arr.splice(duplicateIndex, 1)
      arr.unshift(item)
    } else {
      arr.unshift({
        id: formatUUID(),
        timestamp: now,
        data,
        label,
      })
      if (arr.length > maxCount) {
        arr.splice(maxCount)
      }
    }

    items.value = arr
    save()
  }

  function remove(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
    deleteHistoryRecord(key, id).catch((e) => {
      console.error('[web-tools] history remove error', key, id, e)
    })
  }

  function clear() {
    items.value = []
    clearHistoryRecords(key).catch((e) => {
      console.error('[web-tools] history clear error', key, e)
    })
  }

  return {
    items,
    add,
    remove,
    clear,
  }
}
