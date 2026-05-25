import { ref, type Ref } from 'vue'
import { usePersistedRef } from '@/utils/persist'
import { useHistory, type UseHistoryOptions } from '@/utils/history'

export interface ToolStateOptions<TInput, THistory extends Record<string, unknown>> {
  storageKey: string
  defaultInput: TInput
  historyOptions?: UseHistoryOptions<THistory>
  getHistoryData?: (input: TInput) => THistory | null | undefined
}

export interface ToolState<TInput, THistory extends Record<string, unknown>> {
  input: Ref<TInput>
  isProcessing: Ref<boolean>
  error: Ref<string>
  history: ReturnType<typeof useHistory<THistory>>
  saveHistory: () => void
  setError: (msg: string) => void
  clearError: () => void
  reset: () => void
}

export function useToolState<TInput, THistory extends Record<string, unknown>>(
  options: ToolStateOptions<TInput, THistory>,
): ToolState<TInput, THistory> {
  const { storageKey, defaultInput, historyOptions, getHistoryData } = options

  const input = usePersistedRef<TInput>(`web-tools:${storageKey}:input`, defaultInput)
  const isProcessing = ref(false)
  const error = ref('')

  const history = useHistory<THistory>(`web-tools:${storageKey}:history`, {
    maxCount: 15,
    ...historyOptions,
  })

  function saveHistory() {
    if (typeof input.value === 'string' && !input.value.trim()) return

    const data = getHistoryData
      ? getHistoryData(input.value)
      : (input.value as unknown as THistory)

    if (!data) return
    history.add(data)
  }

  function setError(msg: string) {
    error.value = msg
  }

  function clearError() {
    error.value = ''
  }

  function reset() {
    input.value = defaultInput
    error.value = ''
    isProcessing.value = false
  }

  return {
    input,
    isProcessing,
    error,
    history,
    saveHistory,
    setError,
    clearError,
    reset,
  }
}
