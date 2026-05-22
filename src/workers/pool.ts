type WorkerPayload = { id: string; payload: unknown }

type WorkerResponse<T> =
  | { id: string; ok: true; result: T }
  | { id: string; ok: false; error: string }

export interface WorkerSendOptions {
  /** 超时毫秒数，默认 30_000。设为 0 禁用超时 */
  timeout?: number
}

export interface WorkerLease {
  send<T>(payload: unknown, transfer?: Transferable[]): Promise<T>
  send<T>(payload: unknown, options?: WorkerSendOptions & { transfer?: Transferable[] }): Promise<T>
  /** 发送 ping 检测 Worker 是否存活 */
  healthCheck(timeoutMs?: number): Promise<boolean>
  release(): void
}

interface WorkerPoolOptions {
  size?: number
}

interface PendingEntry {
  resolve: (value: any) => void
  reject: (reason: unknown) => void
  timer?: ReturnType<typeof setTimeout>
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function createWorkerPool(
  workerFactory: () => Worker,
  options: WorkerPoolOptions = {},
) {
  const size = options.size ?? 1
  const idle: Worker[] = []
  const waiters: Array<(worker: Worker) => void> = []
  const allWorkers: Worker[] = []
  let workerCount = 0
  let terminated = false

  function makeWorker(): Worker {
    const w = workerFactory()
    allWorkers.push(w)
    return w
  }

  function acquire(): Promise<WorkerLease> {
    if (terminated) {
      return Promise.reject(new Error('Worker pool has been terminated'))
    }

    return new Promise((resolve) => {
      const idleWorker = idle.pop()
      if (idleWorker) {
        resolve(createLease(idleWorker))
        return
      }

      if (workerCount < size) {
        workerCount += 1
        resolve(createLease(makeWorker()))
        return
      }
      waiters.push((nextWorker) => resolve(createLease(nextWorker)))
    })
  }

  function release(worker: Worker) {
    if (terminated) {
      try { worker.terminate() } catch { /* ok */ }
      return
    }
    const next = waiters.shift()
    if (next) {
      next(worker)
      return
    }
    idle.push(worker)
  }

  /** 终止所有 Worker，清理等待队列 */
  function terminate(): void {
    terminated = true
    for (const w of allWorkers.splice(0)) {
      try { w.terminate() } catch { /* already dead */ }
    }
    idle.length = 0
    workerCount = 0
    waiters.length = 0
  }

  function createLease(worker: Worker): WorkerLease {
    const pending = new Map<string, PendingEntry>()

    const onMessage = (event: MessageEvent<WorkerResponse<unknown>>) => {
      const message = event.data
      if (!message || typeof message !== 'object') return
      const entry = pending.get(message.id)
      if (!entry) return
      pending.delete(message.id)
      if (entry.timer) clearTimeout(entry.timer)
      if (message.ok) {
        entry.resolve(message.result)
      } else {
        entry.reject(new Error(message.error))
      }
    }

    const onError = (_event: ErrorEvent) => {
      for (const [, entry] of pending) {
        if (entry.timer) clearTimeout(entry.timer)
        entry.reject(new Error('Worker terminated unexpectedly'))
      }
      pending.clear()
      const idx = allWorkers.indexOf(worker)
      if (idx !== -1) allWorkers.splice(idx, 1)
      workerCount = Math.max(0, workerCount - 1)
      // 驱动下一个等待者
      const next = waiters.shift()
      if (next) {
        workerCount += 1
        next(makeWorker())
      }
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)

    return {
      send<T>(payload: unknown, arg?: Transferable[] | (WorkerSendOptions & { transfer?: Transferable[] })) {
        let transfer: Transferable[] = []
        let timeout = 30_000

        if (Array.isArray(arg)) {
          transfer = arg
        } else if (arg && typeof arg === 'object') {
          transfer = (arg as { transfer?: Transferable[] }).transfer ?? []
          timeout = (arg as WorkerSendOptions).timeout ?? 30_000
        }

        if (terminated) {
          return Promise.reject(new Error('Worker pool has been terminated'))
        }

        return new Promise<T>((resolve, reject) => {
          const id = makeId()
          const entry: PendingEntry = { resolve, reject }

          if (timeout > 0) {
            entry.timer = setTimeout(() => {
              pending.delete(id)
              reject(new Error(`Worker request timed out after ${timeout}ms`))
            }, timeout)
          }

          pending.set(id, entry)
          try {
            worker.postMessage({ id, payload } satisfies WorkerPayload, transfer)
          } catch (err) {
            pending.delete(id)
            if (entry.timer) clearTimeout(entry.timer)
            reject(err)
          }
        })
      },

      async healthCheck(timeoutMs = 5000): Promise<boolean> {
        try {
          await this.send<{ pong: true }>(
            { type: 'ping' },
            { timeout: timeoutMs },
          )
          return true
        } catch {
          return false
        }
      },

      release() {
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        for (const [, entry] of pending) {
          if (entry.timer) clearTimeout(entry.timer)
          entry.reject(new Error('Worker lease released'))
        }
        pending.clear()
        release(worker)
      },
    }
  }

  return { acquire, terminate }
}
