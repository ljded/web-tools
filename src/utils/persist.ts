import { ref, watch, type Ref } from 'vue'

function getStoredValue(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function setStoredValue<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures in private mode or quota-limited environments.
  }
}

function isCompatibleStoredValue<T>(value: unknown, initialValue: T): value is T {
  if (initialValue === null || initialValue === undefined) return true
  if (Array.isArray(initialValue)) return Array.isArray(value)
  return typeof value === typeof initialValue
}

export function usePersistedRef<T>(key: string, initialValue: T): Ref<T> {
  const stored = getStoredValue(key)
  const state = ref(initialValue) as Ref<T>

  if (stored !== null) {
    try {
      const parsed = JSON.parse(stored) as unknown
      if (isCompatibleStoredValue(parsed, initialValue)) state.value = parsed
    } catch {
      if (typeof initialValue === 'string') state.value = stored as T
    }
  }

  watch(
    state,
    (value) => {
      setStoredValue(key, value)
    },
    { deep: true },
  )

  return state
}
