import { shallowRef } from 'vue'

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
  equals?: (a: T, b: T) => boolean
}

export function useHistory<T extends Record<string, unknown>>(key: string, options: UseHistoryOptions<T> = {}) {
  const { maxCount = 20, debounceMs = 1000, generateLabel, equals } = options

  const items = shallowRef<HistoryItem<T>[]>([])

  // Load from localStorage
  const stored = localStorage.getItem(key)
  if (stored) {
    try {
      items.value = JSON.parse(stored)
    } catch {
      items.value = []
    }
  }

  function save() {
    localStorage.setItem(key, JSON.stringify(items.value))
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
    const label = generateLabel ? generateLabel(data) : JSON.stringify(data).slice(0, 60)

    // Check duplicate
    const duplicateIndex = items.value.findIndex((item) => {
      if (equals) return equals(item.data, data)
      return JSON.stringify(item.data) === JSON.stringify(data)
    })

    if (duplicateIndex !== -1) {
      // Move to top
      const item = items.value[duplicateIndex]!
      item.timestamp = Date.now()
      item.label = label
      items.value.splice(duplicateIndex, 1)
      items.value.unshift(item)
    } else {
      items.value.unshift({
        id: crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`,
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
    save()
  }

  function clear() {
    items.value = []
    save()
  }

  return {
    items,
    add,
    remove,
    clear,
  }
}
