/**
 * 流式文件处理工具
 * 用于处理大文件时避免内存溢出
 */

/**
 * 流式读取文件并转换为 Base64
 *
 * @param file - 要处理的文件
 * @param onProgress - 进度回调 (0-100)
 * @param chunkSize - 每次读取的块大小（字节）
 * @returns Base64 编码的字符串
 */
export async function fileToBase64Stream(
  file: File,
  onProgress?: (progress: number) => void,
  chunkSize: number = 1024 * 1024 // 1MB chunks
): Promise<string> {
  const reader = file.stream().getReader()
  const chunks: string[] = []
  let bytesRead = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // 将 Uint8Array 转换为 Base64
      const chunk = arrayBufferToBase64(value.buffer)
      chunks.push(chunk)

      bytesRead += value.byteLength
      if (onProgress) {
        const progress = Math.round((bytesRead / file.size) * 100)
        onProgress(progress)
      }
    }

    // 合并所有块
    return chunks.join('')
  } finally {
    reader.releaseLock()
  }
}

/**
 * 流式从 Base64 解码并创建 Blob
 *
 * @param base64 - Base64 字符串
 * @param mimeType - MIME 类型
 * @param onProgress - 进度回调 (0-100)
 * @param chunkSize - 每次处理的块大小（字符数）
 * @returns Blob 对象
 */
export async function base64ToBlob(
  base64: string,
  mimeType: string = 'application/octet-stream',
  onProgress?: (progress: number) => void,
  chunkSize: number = 1024 * 1024 // 1MB of base64
): Promise<Blob> {
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let processedChars = 0

  // 移除 data URI 前缀
  let cleanBase64 = base64.trim()
  if (cleanBase64.startsWith('data:')) {
    cleanBase64 = cleanBase64.split(',')[1] || cleanBase64
  }

  const totalChars = cleanBase64.length

  // 分块解码
  for (let i = 0; i < totalChars; i += chunkSize) {
    const chunk = cleanBase64.slice(i, Math.min(i + chunkSize, totalChars))

    try {
      const binaryString = atob(chunk)
      const bytes = new Uint8Array(binaryString.length)

      for (let j = 0; j < binaryString.length; j++) {
        bytes[j] = binaryString.charCodeAt(j)
      }

      chunks.push(bytes as Uint8Array<ArrayBuffer>)
    } catch (error) {
      throw new Error('Invalid base64 string')
    }

    processedChars += chunk.length
    if (onProgress) {
      const progress = Math.round((processedChars / totalChars) * 100)
      onProgress(progress)
    }
  }

  return new Blob(chunks, { type: mimeType })
}

/**
 * 将 ArrayBuffer 转换为 Base64
 *
 * @param buffer - ArrayBuffer
 * @returns Base64 字符串
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }

  return btoa(binary)
}

/**
 * 流式计算文件哈希
 *
 * @param file - 要处理的文件
 * @param algorithm - 哈希算法
 * @param onProgress - 进度回调 (0-100)
 * @returns 哈希值（十六进制字符串）
 */
export async function computeFileHashStream(
  file: File,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256',
  onProgress?: (progress: number) => void
): Promise<string> {
  const reader = file.stream().getReader()
  let bytesRead = 0

  // 使用 Web Crypto API 进行流式哈希计算
  const hashBuffer: number[] = []

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // 计算当前块的哈希
      const chunkHash = await crypto.subtle.digest(algorithm, value)
      hashBuffer.push(...new Uint8Array(chunkHash))

      bytesRead += value.byteLength
      if (onProgress) {
        const progress = Math.round((bytesRead / file.size) * 100)
        onProgress(progress)
      }
    }

    // 将最终哈希转换为十六进制字符串
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  } finally {
    reader.releaseLock()
  }
}

/**
 * 估算处理大文件所需的内存
 *
 * @param fileSize - 文件大小（字节）
 * @param operation - 操作类型
 * @returns 估算的内存使用（字节）
 */
export function estimateMemoryUsage(
  fileSize: number,
  operation: 'base64-encode' | 'base64-decode' | 'hash'
): number {
  switch (operation) {
    case 'base64-encode':
      // Base64 会增加约 33% 的大小
      return fileSize * 1.5
    case 'base64-decode':
      // 解码后约为原 Base64 的 75%
      return fileSize * 0.8
    case 'hash':
      // 哈希只需要读取，内存占用较小
      return Math.min(fileSize * 0.1, 50 * 1024 * 1024) // 最多 50MB
    default:
      return fileSize
  }
}

/**
 * 检查是否应该使用流式处理
 *
 * @param fileSize - 文件大小（字节）
 * @param operation - 操作类型
 * @returns 是否使用流式处理
 */
export function shouldUseStreaming(
  fileSize: number,
  operation: 'base64-encode' | 'base64-decode' | 'hash'
): boolean {
  const threshold = {
    'base64-encode': 10 * 1024 * 1024, // 10MB
    'base64-decode': 10 * 1024 * 1024, // 10MB
    'hash': 50 * 1024 * 1024, // 50MB
  }

  return fileSize > threshold[operation]
}

/**
 * 流式压缩文件（使用 CompressionStream）
 *
 * @param file - 要压缩的文件
 * @param format - 压缩格式
 * @param onProgress - 进度回调
 * @returns 压缩后的 Blob
 */
export async function compressFileStream(
  file: File,
  format: 'gzip' | 'deflate' | 'deflate-raw' = 'gzip',
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // 检查浏览器是否支持 CompressionStream
  if (typeof CompressionStream === 'undefined') {
    throw new Error('CompressionStream is not supported in this browser')
  }

  const reader = file.stream().getReader()
  const compressionStream = new CompressionStream(format)
  const writer = compressionStream.writable.getWriter()
  const chunks: Uint8Array<ArrayBuffer>[] = []

  let bytesRead = 0

  try {
    // 读取并压缩
    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        await writer.write(value)

        bytesRead += value.byteLength
        if (onProgress) {
          const progress = Math.round((bytesRead / file.size) * 100)
          onProgress(progress)
        }
      }
      await writer.close()
    })()

    // 收集压缩后的数据
    const readableReader = compressionStream.readable.getReader()
    const collectPromise = (async () => {
      while (true) {
        const { done, value } = await readableReader.read()
        if (done) break
        chunks.push(value as Uint8Array<ArrayBuffer>)
      }
    })()

    await Promise.all([readPromise, collectPromise])

    return new Blob(chunks, { type: 'application/octet-stream' })
  } finally {
    reader.releaseLock()
  }
}
