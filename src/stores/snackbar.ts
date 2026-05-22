import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface SnackbarAction {
  label: string
  handler: () => void
}

export interface SnackbarMessage {
  id: string
  message: string
  type: 'info' | 'error' | 'success' | 'warning'
  duration: number
  action?: SnackbarAction
}

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const useSnackbarStore = defineStore('snackbar', () => {
  const queue = ref<SnackbarMessage[]>([])
  const current = ref<SnackbarMessage | null>(null)
  const show = ref(false)
  let currentTimer: ReturnType<typeof setTimeout> | null = null

  function next() {
    if (queue.value.length === 0) {
      current.value = null
      show.value = false
      return
    }
    const msg = queue.value.shift()!
    current.value = msg
    show.value = true

    if (currentTimer) clearTimeout(currentTimer)
    currentTimer = setTimeout(() => {
      show.value = false
      // 动画结束后切换到下一条
      setTimeout(() => next(), 300)
    }, msg.duration)
  }

  function open(
    msg: string,
    nextType?: 'info' | 'error' | 'success' | 'warning',
    action?: SnackbarAction,
  ): string
  function open(options: Partial<SnackbarMessage> & { message: string }): string
  function open(
    msgOrOptions: string | (Partial<SnackbarMessage> & { message: string }),
    nextType: 'info' | 'error' | 'success' | 'warning' = 'info',
    action?: SnackbarAction,
  ): string {
    let options: Partial<SnackbarMessage> & { message: string }

    if (typeof msgOrOptions === 'string') {
      options = { message: msgOrOptions, type: nextType, action }
    } else {
      options = msgOrOptions
    }

    const entry: SnackbarMessage = {
      id: makeId(),
      message: options.message,
      type: options.type ?? 'info',
      duration: options.duration ?? 3000,
      action: options.action,
    }

    // 如果当前没有显示的消息，直接显示
    if (!current.value && queue.value.length === 0) {
      current.value = entry
      show.value = true

      if (currentTimer) clearTimeout(currentTimer)
      currentTimer = setTimeout(() => {
        show.value = false
        setTimeout(() => next(), 300)
      }, entry.duration)

      return entry.id
    }

    queue.value.push(entry)
    return entry.id
  }

  function close() {
    show.value = false
    if (currentTimer) clearTimeout(currentTimer)
    setTimeout(() => next(), 300)
  }

  function remove(id: string) {
    if (current.value?.id === id) {
      close()
      return
    }
    queue.value = queue.value.filter((m) => m.id !== id)
  }

  function clear() {
    queue.value = []
    close()
  }

  return {
    queue,
    current,
    show,
    open,
    close,
    remove,
    clear,
  }
})
