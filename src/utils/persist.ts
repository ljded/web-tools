import { ref, watch, type Ref } from 'vue'

export function usePersistedRef<T>(key: string, initialValue: T): Ref<T> {
  const stored = localStorage.getItem(key)
  const state = ref(initialValue) as Ref<T>

  if (stored !== null) {
    try {
      state.value = JSON.parse(stored) as T
    } catch {
      state.value = stored as T
    }
  }

  watch(
    state,
    (value) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    { deep: true },
  )

  return state
}
