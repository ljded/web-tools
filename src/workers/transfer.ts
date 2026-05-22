/**
 * Transferable 安全封装
 *
 * 在 Worker.send() 中使用 transfer 转移 ArrayBuffer 所有权后，
 * 调用方不能再引用原 buffer。本模块提供高层封装避免这个陷阱。
 */

/**
 * sendFile — 将文件分块发送到 Worker 进行流式处理
 *
 * @param lease   WorkerLease 实例
 * @param file    要处理的 File 对象
 * @param config  分块大小和进度回调
 */
export async function sendFile(
  lease: { send: <T>(payload: unknown, transfer?: Transferable[]) => Promise<T> },
  file: File,
  config: {
    chunkSize?: number
    onProgress?: (pct: number) => void
    onSessionStart?: (sessionId: string) => void
  } = {},
): Promise<unknown> {
  const chunkSize = config.chunkSize ?? 1024 * 1024 // 1MB 默认块

  // 1. 开启会话
  const { sessionId } = await lease.send<{ sessionId: string }>({
    type: 'file-start',
  })

  config.onSessionStart?.(sessionId)

  // 2. 逐块发送
  let offset = 0
  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size)
    const slice = file.slice(offset, end)
    const buf = await slice.arrayBuffer()

    await lease.send(
      { type: 'file-chunk', chunk: buf, sessionId },
      [buf], // 转移所有权
    )

    offset = end
    config.onProgress?.(Math.round((offset / file.size) * 100))
  }

  // 3. 结束会话，获取最终结果
  return lease.send({ type: 'file-finish', sessionId })
}

/**
 * sendBytes — 安全地发送单个 ArrayBuffer
 *
 * 调用后原 ref/变量应置为 null，由调用方负责。
 */
export async function sendBytes<T>(
  lease: { send: <R>(payload: unknown, transfer?: Transferable[]) => Promise<R> },
  bytes: ArrayBuffer,
  payload: Record<string, unknown> = {},
): Promise<T> {
  return lease.send<T>({ ...payload, bytes }, [bytes])
}
