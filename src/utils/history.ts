import { shallowRef } from 'vue'
import {
  clearHistoryRecords,
  deleteHistoryRecord,
  getHistoryRecords,
  putHistoryRecords,
} from './db'
import { scheduleIdleTask } from './scheduler'
import { deepEqual } from './deepEqual'

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
 * 使用优化的 deepEqual 函数，避免 JSON 序列化
 */
function defaultEquals<T>(a: T, b: T): boolean {
  return deepEqual(a, b, 5) // 限制深度为 5，平衡性能和准确性
}

/**
 * 安全解析 JSON
 */
function safeParseJSON<T>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    console.warn('[history] Failed to parse JSON from localStorage', error)
    return null
  }
}

export function useHistory<T extends Record<string, unknown>>(
  key: string,
  options: UseHistoryOptions<T> = {},
) {
  const { maxCount = 20, debounceMs = 1000, generateLabel, equals } = options

  const items = shallowRef<HistoryItem<T>[]>([])

  let loaded = false
  let dbReady = false  // 优化：跟踪 DB 准备状态
  let useIndexedDB = true // 标记是否使用 IndexedDB
  const localStorageKey = `history:${key}` // localStorage 键名

  // 优化：异步加载 IndexedDB，不阻塞初始化
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
        dbReady = true
        return
      }

      // 尝试从 localStorage 迁移旧数据
      const legacy = localStorage.getItem(key)
      if (legacy) {
        const parsed = safeParseJSON<HistoryItem<T>[]>(legacy)
        if (parsed && Array.isArray(parsed)) {
          items.value = parsed
          await save()
          localStorage.removeItem(key)
        }
      }
      dbReady = true
    } catch (e) {
      console.warn('[history] IndexedDB unavailable, falling back to localStorage', key, e)
      useIndexedDB = false
      dbReady = true

      // 降级到 localStorage
      loadFromLocalStorage()
    }
    loaded = true
  }

  function loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(localStorageKey)
      if (stored) {
        const parsed = safeParseJSON<HistoryItem<T>[]>(stored)
        if (parsed && Array.isArray(parsed)) {
          items.value = parsed.slice(0, maxCount) // 限制数量
        }
      }
    } catch (e) {
      console.error('[history] Failed to load from localStorage', key, e)
      items.value = []
    }
  }

  loadFromDB() // 优化：异步加载，不 await

  function formatUUID(): string {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
      }
    } catch { /* fall through */ }
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`
  }

  async function save() {
    // 优化：等待 DB 准备好
    if (useIndexedDB && !dbReady) {
      await loadFromDB()
    }

    if (useIndexedDB) {
      return putHistoryRecords(key, items.value).catch((e) => {
        console.error('[history] IndexedDB save error, falling back to localStorage', key, e)
        useIndexedDB = false
        saveToLocalStorage()
      })
    } else {
      return saveToLocalStorage()
    }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(items.value))
      return Promise.resolve()
    } catch (e) {
      console.error('[history] localStorage save error', key, e)
      return Promise.reject(e)
    }
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
    // 优化：使用 requestIdleCallback 延迟保存，不阻塞 UI
    scheduleIdleTask(() => save())
  }

  function remove(id: string) {
    items.value = items.value.filter((item) => item.id !== id)

    // 优化：使用 requestIdleCallback 延迟保存
    scheduleIdleTask(() => {
      if (useIndexedDB) {
        deleteHistoryRecord(key, id).catch((e) => {
          console.error('[history] IndexedDB remove error', key, id, e)
        })
      } else {
        saveToLocalStorage()
      }
    })
  }

  function clear() {
    items.value = []

    // 优化：使用 requestIdleCallback 延迟清理
    scheduleIdleTask(() => {
      if (useIndexedDB) {
        clearHistoryRecords(key).catch((e) => {
          console.error('[history] IndexedDB clear error', key, e)
        })
      } else {
        try {
          localStorage.removeItem(localStorageKey)
        } catch (e) {
          console.error('[history] localStorage clear error', key, e)
        }
      }
    })
  }

  return {
    items,
    add,
    remove,
    clear,
  }
}
